import { Injectable, OnInit } from '@angular/core';
import { Firestore, collectionData, deleteDoc, doc, docData, serverTimestamp } from '@angular/fire/firestore';
import { addDoc, collection, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { Observable, forkJoin, map, switchMap, tap, catchError } from 'rxjs';
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AlertController } from '@ionic/angular';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { from, of } from 'rxjs';

import { AngularFireDatabase } from '@angular/fire/compat/database';

export interface Account{
  id?: string;
  displayName: string;
  email: string;
  password: string;
}

export interface Request {
  id?: string;
  student_name: string;
  document_type: string;
  status: string;
  student_id: string;
  email: string;
  request_date: string; // Add the request_date property
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService implements OnInit {

  constructor(private firestore: Firestore, public fireStore: AngularFirestore,
    public auth: AngularFireAuth, private storage: AngularFireStorage, private alertController: AlertController,
    private afMessaging: AngularFireMessaging, private db: AngularFireDatabase) { 
      
    }

  ngOnInit(): void {
    this.afMessaging.requestToken.subscribe(
      (token) => {
        // Save the token to your server or database for sending notifications
        console.log('FCM token:', token);
      },
      (error) => {
        console.error('Error requesting permission:', error);
      }
    );
  }

  loginWithEmail(data) {
    return this.auth.signInWithEmailAndPassword(data.email, data.password);
  }

  signup(data) {
    return this.auth.createUserWithEmailAndPassword(data.email, data.password);
  }

  logout() {
    this.auth.signOut();
  }

  saveDetails(data) {
    return this.fireStore.collection("users").doc(data.uid).set(data);
  }
  getDetails(data) {
    return this.fireStore.collection("users").doc(data.uid).valueChanges();
  }

  getAccounts(): Observable<Account[]> {
    const notesRef = collection(this.firestore, 'users');
    return collectionData(notesRef, {idField: 'id'}) as Observable<Account[]>;
  }

  getRequests(): Observable<Request[]> {
    const notesRef = collection(this.firestore, 'requests');
    return collectionData(notesRef, {idField: 'id'}) as Observable<Request[]>;
  }

  getAccountById(id: any): Observable<Account> {
    const noteDocRef = doc(this.firestore,`notes/${id}`);
    return docData(noteDocRef, {idField: 'id'}) as Observable<Account>
  }

  getRequestById(id): Observable<Request> {
    const noteDocRef = doc(this.firestore, `requests/${id}`);
    return docData(noteDocRef, {idField: 'id'}) as Observable<Request>
  }

  addRequest(request: Request) {
    const notesRef = collection(this.firestore, 'requests');
    const compositeKey = `${request.student_id}_${request.document_type}`;
  
    return getDocs(query(notesRef, where('compositeKey', '==', compositeKey)))
      .then((querySnapshot) => {
        if (querySnapshot.size === 0) {
          // No duplicate found, so add the request.
          return addDoc(notesRef, {
            ...request, // Add other fields to the document
            compositeKey, // Store the composite key in Firestore
          }).then((docRef) => {
            // Get the ID generated by Firestore and update it in the document
            return updateDoc(doc(notesRef, docRef.id), { id: docRef.id });
          });
        } else {
          // A duplicate request already exists.
          return Promise.reject(new Error('Duplicate request found.'));
        }
      })
      .catch((error) => {
        console.error('Error checking for duplicates or adding request:', error);
        return Promise.reject(error);
      });
  }
  
  addAccount(account: Account) {
    const notesRef = collection(this.firestore, 'users');
    return addDoc(notesRef, account);
  }

  addApproval(request) {
    const notesRef = collection(this.firestore, 'approval');
    return addDoc(notesRef, request);
  }

  addCompleted(request) {
    const notesRef = collection(this.firestore, 'completed_requests');
  
    // Add the current date and time using serverTimestamp
    const completedRequest = {
      ...request,
      completedDateTime: serverTimestamp(),
    };
  
    return addDoc(notesRef, completedRequest);
  }

  deleteRequest(request: Request) {
    const noteDocRef = doc(this.firestore, `requests/${request.id}`);
    return deleteDoc(noteDocRef);
  }

  deleteApproval(approval) {
    const noteDocRef = doc(this.firestore, `approval/${approval.id}`);
    return deleteDoc(noteDocRef);
  }


  updateRequest(request: Request){
    const noteDocRef = doc(this.firestore, `requests/${request.id}`);
    return updateDoc(noteDocRef, {student_name: request.student_name, document_type: request.document_type, status: request.status, student_id: request.student_id});
  }

  getUserDataByUID(uid: string): Observable<any[]> {
    return this.fireStore.collection('requests', ref => ref.where('student_id', '==', uid)).valueChanges();
  }

  getFilesFromFolder(folderPath: string) {
    const ref = this.storage.refFromURL(`gs://your-firebase-project.appspot.com/documents`);
    return ref.listAll().toPromise();
  }

  getFolderContents(folderPath: string): Observable<any[]> {
    const ref = this.storage.ref(folderPath);

    return ref.listAll().pipe(
      switchMap((res) => {
        // Use forkJoin to fetch download URLs for all items in parallel
        const urlObservables = res.items.map((item) => item.getDownloadURL());

        return forkJoin(urlObservables).pipe(
          map((urls) =>
            res.items.map((item, index) => ({
              name: item.name,
              url: urls[index],
            }))
          )
        );
      })
    );
  }

  getItems(): Observable<any[]> {
    return this.fireStore.collection('requests').valueChanges()
  }
  get137(): Observable<any[]> {
    return this.fireStore.collection('requests', ref => ref.where('document_type', '==', 'Form 137')).valueChanges();
  }

  getApproval(): Observable<any[]> {
    return this.fireStore.collection('approval').valueChanges()
  }

  getCompleted(): Observable<any[]> {
    return this.fireStore.collection('completed_requests').valueChanges()
  }

  updateItem(id: string, newData: any): Promise<void> {
    return this.fireStore.doc(`requests/${id}`).update(newData);
  }

 deleteItem(id: string): Promise<void> {
    return this.fireStore.doc(`requests/${id}`).delete();
  } 

  deleteFile(filePath: string): Observable<void> {
    const ref = this.storage.ref(filePath);
    return ref.delete();
  }

  deleteUser(userId: string) {
    return this.fireStore.collection('users').doc(userId).delete();
  }

  getContents() {
    return this.fireStore.collection('requests').valueChanges();
  }

  // Update data in Firestore
  updateContent(docId: string, status: string) {
    return this.fireStore.collection('requests').doc(docId).update(status);
  }
}

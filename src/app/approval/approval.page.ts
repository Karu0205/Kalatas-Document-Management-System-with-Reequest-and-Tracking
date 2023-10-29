import { Component, OnInit, ViewChild } from '@angular/core';
import { FirebaseService, Request } from '../service/firebase.service';
import { AlertController, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormControl } from '@angular/forms';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { ModalPage } from '../modal/modal.page';
import { first } from 'rxjs/operators';
import { EmailService } from '../email.service';
import { IonInput } from '@ionic/angular';
import { PrincipalPage } from '../principal/principal.page';
@Component({
  selector: 'app-approval',
  templateUrl: './approval.page.html',
  styleUrls: ['./approval.page.scss'],
})
export class ApprovalPage implements OnInit {


  copiedText: string = '';
  @ViewChild('textInput', { static: false }) textInput: IonInput;
  fromName: string;
  initialFromName: string;

  toEmail: string = '';
  subject: string = '';
  message: string = '';
  
  accounts = [] as any;
  requests: Request[] = []; 
  items: any[];
  searchText: string;

  approval = [] as any;
  
  copyText(text: string) {
    this.copiedText = text;
    this.textInput.value = text;
  }

  constructor(private dataService: FirebaseService, private alertCtrl: AlertController, 
    private router: Router, private modalCtrl: ModalController, private firestore: AngularFirestore,
    private emailService: EmailService ) {

      this.fromName = 'Sto. Nino Formation and Science School'; // Set this to the default value
      this.initialFromName = this.fromName;

    this.dataService.getAccounts().subscribe(res => {

      this.accounts=res;
    })

    this.dataService.getRequests().subscribe(req => {
      this.requests = req.filter(request => request.document_type === 'Form 137');
    });

   }

  ngOnInit() {
    this.dataService.getItems().subscribe((requests) => {
      console.log("All Requests:", requests);
    
      this.requests = requests
        .filter(request => request.document_type === "Form 137");
    
      console.log("Filtered Requests:", this.requests);
    });

    this.dataService.getApproval().subscribe((approval) => {
      this.approval = approval;
    });

  }



  searchItems() {
    console.log('SearchItems method called');
    console.log('Search Text:', this.searchText);
  
    this.dataService.getItems().subscribe((requests) => {
      if (!this.searchText) {
        // If the search text is empty, display all items with "Form 137."
        this.requests = requests.filter(request => request.document_type === "Form 137");
      } else {
        // If there is a search text, filter items based on it and "Form 137."
        const filteredRequests = requests.filter((request) => {
          return (
            request.document_type === "Form 137" &&
            (
              request.student_name.toLowerCase().includes(this.searchText.toLowerCase()) ||
              request.status.toLowerCase().includes(this.searchText.toLowerCase()) ||
              request.request_date.toLowerCase().includes(this.searchText.toLowerCase())
            )
          );
        });
        this.requests = filteredRequests;
      }
      console.log('Filtered items:', this.requests); // Log the filtered items
    });
  }


  async filterList(event) {
    //this.requests = await this.initializeItems();
    const searchTerm = event.target.value;
  
    if (!searchTerm) {
      return;
    }
  
    this.requests = this.requests.filter((currentReq) => {
      if (currentReq.student_name && searchTerm) {
        return (
          currentReq.student_name.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1 ||
          currentReq.status.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1 ||
          currentReq.document_type.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1
        );
      }
      return false; // Add a default return statement
    });
  }

  accountList(){

  }

  requestList(){

  }

  async openRequest(request){
    const modal = await this.modalCtrl.create({
      component: PrincipalPage,
      componentProps: { id: request.id },
    });
    modal.present();
  }

  logOut(){
    this.dataService.logout();
    this.router.navigate(['/adminlogin'])
  }

  openDocu(){
    this.router.navigate(['/documents'])
  }

  openRegister(){
    this.router.navigate(['/signup'])
  }

  openStorage(){
    this.router.navigate(['/storage-menu'])
  }

  openCalendar(){
    this.router.navigate(['/calendar'])
  }

  editItem(id: string, newData: any) {
    // First, update the item in the existing collection
    console.log('Editing item with ID:', id);
    this.dataService.updateItem(id, newData)
      .then(() => {
        console.log('Item updated successfully.');
  
        // After successful update, re-fetch the data to reflect the changes
        this.dataService.getItems().subscribe((requests) => {
          this.requests = requests;
          console.log('Data reloaded after edit:', this.requests);
        });
  
        // Add the updated data to the "logs" collection
        const logData = {
          itemId: id,
          updatedData: newData,
          timestamp: new Date() // This captures the current timestamp
        };
  
        // Use AngularFire to add data to the "logs" collection
        this.firestore.collection('logs').add(logData)
          .then(() => {
            console.log('Log added successfully.');
          })
          .catch((error) => {
            console.error('Error adding log:', error);
          });
      })
      .catch((error) => {
        console.error('Error updating item:', error);
      });
  }

  async deleteItem(id: string) {
    const confirmationAlert = await this.alertCtrl.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this item?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          handler: () => {
            // User confirmed deletion, proceed with delete operation.
            this.dataService
              .deleteItem(id)
              .then(() => {
                console.log('Item deleted successfully.');
                // Remove the deleted item from the local array to update the UI.
                this.requests = this.requests.filter((requests) => requests.id !== id);
              })
              .catch((error) => {
                console.error('Error deleting item:', error);
              });
          },
        },
      ],
    });
  
    await confirmationAlert.present();
  }

  
  async closeModal() {
    await this.modalCtrl.dismiss();
  }

}

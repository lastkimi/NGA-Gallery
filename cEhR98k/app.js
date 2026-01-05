import { dataService } from './data_service.js';
import { UIController } from './ui_controller.js';

document.addEventListener('DOMContentLoaded', async () => {

    await dataService.init();
    

    const ui = new UIController();
    

    ui.loadMore();


    window.closeModal = () => ui.closeModal();


    lucide.createIcons();

    console.log("NGA Digital Platform Initialized. 62,307 records ready.");
});

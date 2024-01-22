document.addEventListener('DOMContentLoaded', function () {
  const pathTab = document.getElementById('pathTab');
  const paramTab = document.getElementById('paramTab');
  const headerTab = document.getElementById('headerTab');

  const pathCounter= document.getElementById('pathCounter');
  const paramCounter = document.getElementById('paramCounter');
  const headerCounter = document.getElementById('headerCounter');

  const pathContent = document.getElementById('pathContent');
  const paramContent = document.getElementById('paramContent');
  const headerContent = document.getElementById('headerContent');

  const pathTable = document.getElementById('pathTable');
  const paramTable = document.getElementById('paramTable');
  const headerTable = document.getElementById('headerTable');

  const downloadPath = document.getElementById('downloadPath');
  const downloadParam = document.getElementById('downloadParam');
  const downloadHeader = document.getElementById('downloadHeader');

  pathTab.addEventListener('click', () => {
    showTab('path');
    retrieve_and_display_data('path', pathTable, pathCounter);
  });
  
  downloadPath.addEventListener('click', () => {
    download_data('path');
  });

  paramTab.addEventListener('click', () => {
    showTab('param');
    retrieve_and_display_data('param', paramTable, paramCounter);
  });

  downloadParam.addEventListener('click', () => {
    download_data('param');
  });

  headerTab.addEventListener('click', () => {
    showTab('header');
    retrieve_and_display_data('header', headerTable, headerCounter);
  });
  downloadHeader.addEventListener('click', () => {
    download_data('header');
  });

  function showTab(tabName) {
    pathContent.style.display = tabName === 'path' ? 'block' : 'none';
    paramContent.style.display = tabName === 'param' ? 'block' : 'none';
    headerContent.style.display = tabName === 'header' ? 'block' : 'none';

    pathTab.classList.toggle('active', tabName === 'path');
    paramTab.classList.toggle('active', tabName === 'param');
    headerTab.classList.toggle('active', tabName === 'header');
  }

  function retrieve_and_display_data(storeName, table, counter) {
    retrieve_keys_from(storeName)
      .then(data => {

        counter.textContent = data.length;
        
        table.innerHTML = ''; // Clear previous content

        // Populate the table with data

        data.sort().forEach(path => {
          const row = table.insertRow();
          const cell = row.insertCell();
          cell.textContent = path;
        });
      })
      .catch(error => {
        console.error(`Error retrieving and displaying path data: ${error}`);
        // Handle the error as needed
      });
  }
  
  function download_data(storeName) {
    retrieve_keys_from(storeName)
      .then(keys => {
        const plainList = keys.join('\n');
  
        const blob = new Blob([plainList], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
  
        const a = document.createElement('a');
        a.href = url;
        a.download = `wordlister-${storeName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error(`Error downloading data: ${error}`);
        // Handle the error as needed
      });
  }
  

  function retrieve_data_from(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.getAll();
  
      request.onsuccess = (event) => {
        const data = event.target.result;
        resolve(data);
      };
  
      request.onerror = (event) => {
        console.error(`Error retrieving data from ${storeName} object store: ${event.target.error}`);
        reject(event.target.error);
      };
    });
  }

  function retrieve_keys_from(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.getAllKeys();
  
      request.onsuccess = (event) => {
        const keys = event.target.result;
        resolve(keys);
      };
  
      request.onerror = (event) => {
        console.error(`Error retrieving keys from ${storeName} object store: ${event.target.error}`);
        reject(event.target.error);
      };
    });
  }

  // Open or create the IndexedDB database
  const DBOpenRequest = indexedDB.open('wordlister_data_db', 1);

  let db;

  // Handle the successful opening of the database
  DBOpenRequest.onsuccess = (event) => {
    db = DBOpenRequest.result;
    console.log('Successfully opened the IndexedDB:', db);

    // After opening the database, you can perform further actions if needed
    // For example, you might want to retrieve and display initial data
    pathTab.click();
  };

  // Handle errors during the database open or upgrade
  DBOpenRequest.onerror = (event) => {
    console.error('Error opening or upgrading the IndexedDB:', event.target.error);
  };
});

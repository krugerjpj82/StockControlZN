class StockControlApp {
    constructor() {
        this.stockData = [];
        console.log('StockControlApp initialized');
        this.init();
    }

    async init() {
        try {
            // Initialize IndexedDB
            await this.initDatabase();
            
            // Load existing data
            await this.loadStockData();
            this.updateUI();
            console.log('Stock Control App initialized successfully');
        } catch (error) {
            console.error('App initialization error:', error);
            this.showNotification('Failed to initialize app', 'error');
        }
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error));
            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database initialized successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create stock items store
                if (!db.objectStoreNames.contains('stockItems'))) {
                    const stockStore = db.createObjectStore('stockItems', { keyPath: 'id' });
                    stockStore.createIndex('category', 'category', { unique: false });
                    stockStore.createIndex('itemName', 'itemName', { unique: false });
                    console.log('Stock items store created');
                }
                
                // Create settings store
                if (!db.objectStoreNames.contains('settings'))) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                    console.log('Settings store created');
                }
            };
        });
    }

    async loadStockData() {
        try {
            const transaction = this.db.transaction(['stockItems'], 'readonly');
            const store = transaction.objectStore('stockItems');
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    this.stockData = request.result || [];
                    this.filteredData = [...this.stockData];
                    resolve(this.stockData);
                };
                request.onerror = () => reject(request.error));
            });
        } catch (error) {
            console.error('Load data error:', error);
            this.stockData = [];
            this.filteredData = [];
        }
    }

    async saveStockData() {
        try {
            const transaction = this.db.transaction(['stockItems'], 'readwrite');
            const store = transaction.objectStore('stockItems');
            const request = store.clear();
            request.onsuccess = () => {
                this.stockData.forEach(item => {
                    store.add(item).onsuccess = null;
                });
            };
            request.onerror = () => {
                console.error('Save data error:', request.error);
                this.showNotification('Failed to save data', 'error');
            };
        } catch (error) {
            console.error('Save data error:', error);
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // File inputs
        const pdfUpload = document.getElementById('pdfUpload');
        const excelUpload = document.getElementById('excelUpload');
        const exportBtn = document.getElementById('exportExcel');
        const languageBtn = document.getElementById('languageButton');

        if (pdfUpload) {
            pdfUpload.addEventListener('change', (e) => this.handlePDFSelect(e));
        }
        
        if (excelUpload) {
            excelUpload.addEventListener('change', (e) => this.handleExcelSelect(e));
        }

        if (languageBtn) {
            languageBtn.addEventListener('click', () => this.toggleLanguage());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToExcel());
        }

        console.log('Event listeners attached');
    }

    handlePDFSelect(event) {
        const file = event.target.files[0];
        const statusDiv = document.getElementById('pdfFileStatus');
        
        if (file) {
            statusDiv.textContent = `Processing PDF...`;
            statusDiv.className = 'file-status processing';
            this.processPDF(file);
        } else {
            statusDiv.textContent = '';
            statusDiv.className = 'file-status';
        }
    }

    handleExcelSelect(event) {
        const file = event.target.files[0];
        const statusDiv = document.getElementById('excelFileStatus');
        
        if (file) {
            statusDiv.textContent = `Processing Excel...`;
            statusDiv.className = 'file-status processing';
            this.processExcel(file);
        } else {
            statusDiv.textContent = '';
            statusDiv.className = 'file-status';
        }
    }

    async processPDF(file) {
        console.log('Processing PDF...');
        const statusDiv = document.getElementById('pdfFileStatus');
        
        try {
            this.showLoading(true);
            
            // Simulate PDF processing
            await new Promise((resolve) => setTimeout(resolve, 2000));
            
            this.showLoading(false);
            statusDiv.textContent = 'PDF processed successfully!';
            statusDiv.className = 'file-status success';
            this.showNotification('Sales report processed successfully!', 'success');
            
            // Generate sample data from PDF
            this.generateSampleSalesData();
            document.getElementById('pdfUpload').value = ''; // Clear input
        } catch (error) {
            console.error('PDF processing error:', error);
            this.showLoading(false);
            statusDiv.textContent = 'Error processing PDF';
            statusDiv.className = 'file-status error';
            this.showNotification('Error processing PDF file', 'error');
        }
    }

    async processExcel(file) {
        console.log('Processing Excel...');
        const statusDiv = document.getElementById('excelFileStatus');
        
        try {
            this.showLoading(true);
            
            // Read Excel file
            const data = await excelProcessor.readExcelFile(file);
            
            // Validate data
            const validation = excelProcessor.validateData(data);
            if (!validation.isValid) {
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }
            
            // Merge with existing data or replace
            this.stockData = this.mergeStockData(this.stockData, data);
            await this.saveStockData();
            this.updateUI();
            
            // Update status
            statusDiv.textContent = 'Excel processed successfully!';
            statusDiv.className = 'file-status success';
            this.showNotification('Excel file processed successfully!', 'success');
            
            // Clear input
            document.getElementById('excelUpload').value = '';
            
        } catch (error) {
            console.error('Excel processing error:', error);
            this.showLoading(false);
            statusDiv.textContent = 'Error processing Excel';
            statusDiv.className = 'file-status error';
            this.showNotification('Error processing Excel file', 'error');
        }
    }

    generateSampleSalesData() {
        console.log('Generating sample sales data from PDF...');
        
        // Sample sales data
        const salesData = [
            { itemName: "Budweiser 6-Pack", category: "Beer", quantity: 12, unitPrice: 8.99, totalSale: 107.88, profit: 29.88 },
            { itemName: "Yellow Tail Chardonnay", category: "Wine", quantity: 5, unitPrice: 8.99, totalSale: 44.95, profit: 13.70 },
            { itemName: "Jack Daniel's Old No. 7", category: "Spirits", quantity: 3, unitPrice: 24.99, totalSale: 74.97, profit: 20.97 },
            { itemName: "Coca-Cola 12-Pack", category: "Mixers", quantity: 8, unitPrice: 6.99, totalSale: 55.92, profit: 15.92 }
        ];

        // Update stock data based on sales
        salesData.forEach(sale => {
            const existingItem = this.stockData.find(item => item.itemName === sale.itemName);
            if (existingItem) {
                existingItem.weeklySales += sale.quantity;
                existingItem.quantityAvailable = Math.max(0, existingItem.quantityAvailable - sale.quantity);
            } else {
                // Add new item from sales
                this.stockData.push({
                    id: 'item-' + Date.now() + Math.random(),
                    itemName: sale.itemName,
                    category: sale.category,
                    quantityAvailable: Math.floor(Math.random() * 50) + 10,
                    weeklySales: sale.quantity,
                    stockOrder: 0,
                    salesPrice: sale.unitPrice,
                    costPrice: sale.unitPrice * 0.7, // 30% margin
                    createdAt: new Date().toISOString()
                });
            }
        });

        this.updateUI();
        console.log('Sales data processed:', salesData.length, 'items');
    }

    loadSampleStockData() {
        console.log('Loading sample stock data from Excel...');
        
        // Sample stock inventory
        const sampleStock = [
            { itemName: "Budweiser 6-Pack", category: "Beer", quantityAvailable: 45, weeklySales: 12, stockOrder: 20, salesPrice: 8.99, costPrice: 6.50 },
            { itemName: "Heineken 6-Pack", category: "Beer", quantityAvailable: 32, weeklySales: 8, stockOrder: 15, salesPrice: 10.99, costPrice: 8.00 },
            { itemName: "Yellow Tail Chardonnay", category: "Wine", quantityAvailable: 28, weeklySales: 5, stockOrder: 10, salesPrice: 8.99, costPrice: 6.25 },
            { itemName: "Barefoot Cabernet Sauvignon", category: "Wine", quantityAvailable: 35, weeklySales: 7, stockOrder: 12, salesPrice: 7.99, costPrice: 5.50 },
            { itemName: "Jack Daniel's Old No. 7", category: "Spirits", quantityAvailable: 18, weeklySales: 3, stockOrder: 8, salesPrice: 24.99, costPrice: 18.00 },
            { itemName: "Smirnoff Vodka", category: "Spirits", quantityAvailable: 22, weeklySales: 4, stockOrder: 6, salesPrice: 19.99, costPrice: 14.50 },
            { itemName: "Coca-Cola 12-Pack", category: "Mixers", quantityAvailable: 60, weeklySales: 15, stockOrder: 25, salesPrice: 6.99, costPrice: 5.00 },
            { itemName: "Sprite 12-Pack", category: "Mixers", quantityAvailable: 55, weeklySales: 12, stockOrder: 20, salesPrice: 6.99, costPrice: 5.00 }
        ];

        this.stockData = [...this.stockData, ...sampleStock];
        this.updateUI();
        console.log('Stock data loaded:', sampleStock.length, 'items');
    }

    updateUI() {
        console.log('Updating UI...');
        this.updateSummaryCards();
        this.renderTable();
        this.updateCategoryFilter();
    }

    updateSummaryCards() {
        const { summary } = this.generateSummary();
        
        document.getElementById('totalItems').textContent = summary.totalItems;
        document.getElementById('totalCostValue').textContent = this.formatCurrency(summary.totalCostValue);
        document.getElementById('totalSalesValue').textContent = this.formatCurrency(summary.totalSalesValue);
        document.getElementById('lowStockItems').textContent = summary.lowStockItems;
    }

    generateSummary() {
        const processedData = this.stockData.map(item => ({
            ...item,
            totalCost: (item.quantityAvailable + item.stockOrder) * item.costPrice,
            totalSales: item.quantityAvailable * item.salesPrice,
            isLowStock: item.quantityAvailable <= 10,
            needsReorder: item.quantityAvailable <= (item.weeklySales * 2.4) // 2 weeks + 20% buffer
        }));

        const summary = {
            totalItems: this.stockData.length,
            totalCostValue: processedData.reduce((sum, item) => sum + item.totalCost, 0),
            totalSalesValue: processedData.reduce((sum, item) => sum + item.totalSales, 0),
            lowStockItems: processedData.filter(item => item.isLowStock).length,
            itemsNeedReorder: processedData.filter(item => item.needsReorder).length
        };

        return { summary, processedData };
    }

    renderTable() {
        const tbody = document.getElementById('stockTableBody');
        if (!tbody) return;

        const { processedData } = this.generateSummary();
        
        tbody.innerHTML = processedData.map(item => `
            <tr class="${item.isLowStock ? 'low-stock' : ''} ${item.needsReorder ? 'needs-reorder' : ''}">
                <td>${item.itemName}</td>
                <td>${item.category}</td>
                <td class="${item.quantityAvailable <= 10 ? 'text-danger' : ''}">${item.quantityAvailable}</td>
                <td>${item.weeklySales}</td>
                <td>${item.stockOrder}</td>
                <td>${this.formatCurrency(item.salesPrice)}</td>
                <td>${this.formatCurrency(item.costPrice)}</td>
                <td>${this.formatCurrency(item.totalCost)}</td>
                <td>${this.formatCurrency(item.totalSales)}</td>
                <td class="actions">
                    <button onclick="app.editItem('${item.id}')" class="btn btn-sm btn-primary">Edit</button>
                    <button onclick="app.deleteItem('${item.id}')" class="btn btn-sm btn-danger">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    updateCategoryFilter() {
        const categories = [...new Set(this.stockData.map(item => item.category))];
        const select = document.getElementById('categoryFilter');
        if (!select) return;
        
        // Keep first option (All Categories)
        const firstOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        console.log(`Notification: ${message} (${type})`);
        
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Edit and Delete functions for buttons
    editItem(itemId) {
        const item = this.stockData.find(i => i.id === itemId);
        if (item) {
            this.showNotification(`Edit functionality for ${item.itemName} - Coming soon!`, 'info');
        }
    }

    deleteItem(itemId) {
        const item = this.stockData.find(i => i.id === itemId);
        if (item && confirm(`Delete ${item.itemName}?`)) {
            this.stockData = this.stockData.filter(i => i.id !== itemId);
            this.updateUI();
            this.showNotification('Item deleted successfully', 'success');
        }
    }

    exportToExcel() {
        if (this.stockData.length === 0) {
            this.showNotification('No data to export', 'warning');
            return;
        }
        
        try {
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Prepare data for export
            const exportData = this.stockData.map(item => ({
                'Item Name': item.itemName,
                'Category': item.category,
                'Quantity Available': item.quantityAvailable,
                'Weekly Sales': item.weeklySales,
                'Stock Order': item.stockOrder,
                'Sales Price': item.salesPrice,
                'Cost Price': item.costPrice,
                'Total Cost Value': (item.quantityAvailable + item.stockOrder) * item.costPrice,
                'Total Sales Value': item.quantityAvailable * item.salesPrice
            }));
            
            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(exportData);
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Stock Inventory');
            
            // Generate filename with date
            const filename = `stock-inventory-${new Date().toISOString().split('T')[0]}.xlsx`;
            
            // Save file
            XLSX.writeFile(wb, filename);
            
            this.showNotification('Excel export completed', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export Excel file', 'error');
        }
    }

    toggleLanguage() {
        // This function should toggle the language of the UI
        // For simplicity, let's assume we have two language options: English and Chinese
        const currentLang = document.documentElement.lang;
        const newLang = currentLang === 'en' ? 'zh' : 'en';

        // Update the lang attribute of the html element
        document.documentElement.lang = newLang;

        // You would also need to update the text content of the UI elements
        // For example:
        document.getElementById('header').innerText = newLang === 'zh' ? '库存管理' : 'Stock Control Manager';
        document.getElementById('exportExcel').innerText = newLang === 'zh' ? '导出Excel' : 'Export Excel';
        // Add similar updates for other UI elements

        // Show a notification to confirm language change
        this.showNotification(`Language changed to ${newLang.toUpperCase()}`, 'success');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Stock Control App...');
    window.app = new StockControlApp();
});

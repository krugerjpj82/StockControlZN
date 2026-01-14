// js/app.js

// Configure PDF.js Worker (Required for PDF reading)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', () => {
    let inventory = [];

    const elements = {
        excelInput: document.getElementById('excelUpload'),
        pdfInput: document.getElementById('pdfUpload'),
        tableBody: document.getElementById('stockTableBody'),
        loader: document.getElementById('loadingSpinner'),
        excelStatus: document.getElementById('excelFileStatus')
    };

    elements.excelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        elements.loader.style.display = 'flex';

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // IMPORTANT: { range: 3 } tells XLSX to use Row 4 as the header row
                const json = XLSX.utils.sheet_to_json(worksheet, { range: 3 });

                // DEBUG: Look at your browser console (F12) to see these headers
                if (json.length > 0) {
                    console.log("Detected Headers from Row 4:", Object.keys(json[0]));
                }

                inventory = json.map(row => {
                    return {
                        // These keys MUST match the text in Row 4 of your Excel exactly
                        name: row['Item Name'] || row['Product'] || row['Name'] || 'Unknown',
                        category: row['Category'] || row['Group'] || 'General',
                        qty: parseFloat(row['Qty Available'] || row['Quantity'] || row['Stock']) || 0,
                        sales: 0, 
                        price: parseFloat(row['Sales Price'] || row['Price']) || 0,
                        cost: parseFloat(row['Cost Price'] || row['Cost']) || 0
                    };
                });

                // Remove rows where the name couldn't be found
                inventory = inventory.filter(item => item.name !== 'Unknown');

                renderTable();
                elements.excelStatus.textContent = `✅ Successfully loaded ${inventory.length} items.`;
                elements.excelStatus.className = "file-status success";
            } catch (err) {
                console.error("Excel Parsing Error:", err);
                elements.excelStatus.textContent = "❌ Error: Could not read Row 4 headers.";
                elements.excelStatus.className = "file-status error";
            }
            elements.loader.style.display = 'none';
        };
        reader.readAsArrayBuffer(file);
    });

    function renderTable() {
        elements.tableBody.innerHTML = inventory.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.qty}</td>
                <td>${item.sales}</td>
                <td>${Math.max(0, (item.sales * 1.5) - item.qty).toFixed(0)}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${item.cost.toFixed(2)}</td>
                <td>$${(item.qty * item.cost).toFixed(2)}</td>
                <td>$${(item.qty * item.price).toFixed(2)}</td>
                <td><button onclick="this.closest('tr').remove()" class="btn btn-danger btn-sm">Delete</button></td>
            </tr>
        `).join('');
    }
});

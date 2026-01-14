// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', () => {
    let inventory = [];

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch(console.error);
    }

    const elements = {
        excelInput: document.getElementById('excelUpload'),
        pdfInput: document.getElementById('pdfUpload'),
        tableBody: document.getElementById('stockTableBody'),
        loader: document.getElementById('loadingSpinner'),
        excelStatus: document.getElementById('excelFileStatus'),
        pdfStatus: document.getElementById('pdfFileStatus')
    };

    // --- 1. Excel Logic (Populate Table) ---
    elements.excelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        elements.loader.style.display = 'flex';

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                // Read the first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to JSON
                const json = XLSX.utils.sheet_to_json(worksheet);

                console.log("Found Excel Headers:", Object.keys(json[0])); // Debugging

                // Map Excel rows to App Data
                inventory = json.map(row => {
                    return {
                        // We check multiple common names for each column
                        name: row['Item Name'] || row['Name'] || row['Product'] || row['Description'] || row['项目名称'] || 'Unknown',
                        category: row['Category'] || row['Cat'] || row['Group'] || row['类别'] || 'General',
                        qty: parseNumber(row['Qty'] || row['Quantity'] || row['Stock'] || row['On Hand'] || row['数量']),
                        sales: 0, // Will be filled by PDF later
                        price: parseNumber(row['Price'] || row['Sales Price'] || row['Retail'] || row['销售价']),
                        cost: parseNumber(row['Cost'] || row['Cost Price'] || row['Unit Cost'] || row['成本价'])
                    };
                });

                renderTable();
                elements.excelStatus.textContent = `✅ Loaded ${inventory.length} items`;
                elements.excelStatus.style.color = "#28a745";
            } catch (err) {
                console.error("Excel Error:", err);
                elements.excelStatus.textContent = "❌ Error reading Excel";
                elements.excelStatus.style.color = "#dc3545";
            }
            elements.loader.style.display = 'none';
        };
        reader.readAsArrayBuffer(file);
    });

    // --- 2. PDF Logic (Update Sales) ---
    elements.pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (inventory.length === 0) {
            alert("Please upload Excel file first!");
            return;
        }

        const reader = new FileReader();
        elements.loader.style.display = 'flex';

        reader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = "";

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += content.items.map(item => item.str).join(" ") + " ";
                }

                let matchedCount = 0;
                inventory.forEach(item => {
                    if (item.name === 'Unknown') return;

                    // Clean name for regex (escape special chars)
                    const cleanName = item.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    
                    // Look for: Name + any spaces + Number
                    const regex = new RegExp(`${cleanName}\\s+(\\d+)`, 'i');
                    const match = fullText.match(regex);
                    
                    if (match) {
                        item.sales = parseInt(match[1]);
                        matchedCount++;
                    }
                });

                renderTable();
                elements.pdfStatus.textContent = `✅ Updated ${matchedCount} items from PDF`;
                elements.pdfStatus.style.color = "#28a745";
            } catch (err) {
                console.error(err);
                elements.pdfStatus.textContent = "❌ Error reading PDF";
            }
            elements.loader.style.display = 'none';
        };
        reader.readAsArrayBuffer(file);
    });

    // --- Helper Functions ---

    function parseNumber(val) {
        if (!val) return 0;
        // Handle strings like "$1,200.50" or "1 200"
        if (typeof val === 'string') {
            val = val.replace(/[^0-9.-]+/g, "");
        }
        return parseFloat(val) || 0;
    }

    function renderTable() {
        elements.tableBody.innerHTML = inventory.map(item => {
            // Calculation: (Sales * 1.5) - Stock
            const orderNeeded = Math.max(0, (item.sales * 1.5) - item.qty).toFixed(0);
            
            return `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>${item.qty}</td>
                    <td>${item.sales}</td>
                    <td style="color: ${orderNeeded > 0 ? 'red' : 'green'}; font-weight: bold;">
                        ${orderNeeded > 0 ? orderNeeded : '-'}
                    </td>
                    <td>¥${item.price.toFixed(2)}</td>
                    <td>¥${item.cost.toFixed(2)}</td>
                    <td><button onclick="this.closest('tr').remove()" style="color:red; cursor:pointer;">删除</button></td>
                </tr>
            `;
        }).join('');
    }
});

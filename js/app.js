// 1. Configure the PDF.js Worker (REQUIRED for reading PDFs)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', () => {
    let inventory = [];

    // Register Service Worker with a relative path for GitHub Pages
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(() => console.log("Service Worker 注册成功"))
            .catch(err => console.log("Service Worker 注册失败", err));
    }

    const elements = {
        excelInput: document.getElementById('excelUpload'),
        pdfInput: document.getElementById('pdfUpload'),
        tableBody: document.getElementById('stockTableBody'),
        loader: document.getElementById('loadingSpinner'),
        excelStatus: document.getElementById('excelFileStatus'),
        pdfStatus: document.getElementById('pdfFileStatus')
    };

    // 2. Logic to process Excel (Inventory Data)
    elements.excelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        elements.loader.style.display = 'flex';

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                
                inventory = json.map(row => ({
                    // Support both English and Chinese headers from your Excel
                    name: row['Item Name'] || row['项目名称'] || row['Name'] || '未知',
                    category: row['Category'] || row['类别'] || '常规',
                    qty: parseFloat(row['Qty Available'] || row['数量'] || row['Qty']) || 0,
                    sales: 0,
                    price: parseFloat(row['Sales Price'] || row['销售价'] || row['Price']) || 0,
                    cost: parseFloat(row['Cost Price'] || row['成本价'] || row['Cost']) || 0
                }));

                renderTable();
                elements.excelStatus.textContent = `✅ 已加载 ${inventory.length} 个项目`;
                elements.excelStatus.style.color = "#28a745";
            } catch (err) {
                console.error("Excel Error:", err);
                elements.excelStatus.textContent = "❌ Excel 解析错误";
                elements.excelStatus.style.color = "#dc3545";
            }
            elements.loader.style.display = 'none';
        };
        reader.readAsArrayBuffer(file);
    });

    // 3. Logic to process PDF (Sales Data)
    elements.pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (inventory.length === 0) {
            alert("请先上传 Excel 库存数据！");
            return;
        }

        elements.loader.style.display = 'flex';
        const reader = new FileReader();

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

                inventory.forEach(item => {
                    const escapedName = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`${escapedName}\\s+(\\d+)`, 'i');
                    const match = fullText.match(regex);
                    if (match) item.sales = parseInt(match[1]);
                });

                renderTable();
                elements.pdfStatus.textContent = "✅ 销售数据已合并";
                elements.pdfStatus.style.color = "#28a745";
            } catch (err) {
                console.error("PDF Error:", err);
                elements.pdfStatus.textContent = "❌ PDF 解析错误";
                elements.pdfStatus.style.color = "#dc3545";
            }
            elements.loader.style.display = 'none';
        };
        reader.readAsArrayBuffer(file);
    });

    function renderTable() {
        elements.tableBody.innerHTML = inventory.map(item => {
            const order = Math.max(0, (item.sales * 1.5) - item.qty).toFixed(0);
            return `
                <tr class="${item.qty < 5 ? 'low-stock' : ''}">
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>${item.qty}</td>
                    <td><strong>${item.sales}</strong></td>
                    <td style="color: ${order > 0 ? '#d9534f' : 'inherit'}; font-weight: bold;">
                        ${order > 0 ? order : '-'}
                    </td>
                    <td>¥${item.price.toFixed(2)}</td>
                    <td>¥${item.cost.toFixed(2)}</td>
                    <td><button onclick="this.closest('tr').remove()" class="btn-del">删除</button></td>
                </tr>
            `;
        }).join('');
    }
});
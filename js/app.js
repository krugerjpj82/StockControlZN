pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', () => {
    let inventory = [];
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch(err => console.log("SW Failed", err));
    }

    const elements = {
        excelInput: document.getElementById('excelUpload'),
        pdfInput: document.getElementById('pdfUpload'),
        tableBody: document.getElementById('stockTableBody'),
        loader: document.getElementById('loadingSpinner'),
        excelStatus: document.getElementById('excelFileStatus'),
        pdfStatus: document.getElementById('pdfFileStatus')
    };

    elements.excelInput.addEventListener('change', (e) => {
        const reader = new FileReader();
        elements.loader.style.display = 'flex';
        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            inventory = json.map(row => ({
                name: row['Item Name'] || row['项目名称'] || '未知',
                category: row['Category'] || row['类别'] || '常规',
                qty: parseFloat(row['Qty'] || row['数量']) || 0,
                sales: 0,
                price: parseFloat(row['Price'] || row['销售价']) || 0,
                cost: parseFloat(row['Cost'] || row['成本价']) || 0
            }));
            renderTable();
            elements.loader.style.display = 'none';
            elements.excelStatus.textContent = `已成功加载 ${inventory.length} 个项目`;
        };
        reader.readAsArrayBuffer(e.target.files[0]);
    });

    elements.pdfInput.addEventListener('change', async (e) => {
        const reader = new FileReader();
        elements.loader.style.display = 'flex';
        reader.onload = async function() {
            const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
            let text = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(" ");
            }
            inventory.forEach(item => {
                const match = text.match(new RegExp(`${item.name}\\s+(\\d+)`, 'i'));
                if (match) item.sales = parseInt(match[1]);
            });
            renderTable();
            elements.loader.style.display = 'none';
            elements.pdfStatus.textContent = "销售数据已更新";
        };
        reader.readAsArrayBuffer(e.target.files[0]);
    });

    function renderTable() {
        elements.tableBody.innerHTML = inventory.map(item => `
            <tr>
                <td>${item.name}</td><td>${item.category}</td><td>${item.qty}</td>
                <td>${item.sales}</td><td>${Math.max(0, (item.sales * 1.5) - item.qty).toFixed(0)}</td>
                <td>¥${item.price.toFixed(2)}</td><td>¥${item.cost.toFixed(2)}</td>
                <td><button onclick="this.closest('tr').remove()" style="color:red; cursor:pointer; border:none; background:none;">删除</button></td>
            </tr>
        `).join('');
        // Update summary logic here
    }
});
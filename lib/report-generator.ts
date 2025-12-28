
export const generateHtmlReport = (data: any[], title: string, columns: string[] = []): string => {
    // Basic CSS for both empty and populated states
    const css = `
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background: #f4f4f9; color: #333; }
            h1 { color: #2c3e50; margin-bottom: 20px; text-transform: capitalize; }
            .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: 600; color: #555; position: sticky; top: 0; }
            tr:hover { background-color: #f5f5f5; }
            .footer { margin-top: 20px; color: #888; font-size: 12px; text-align: right; }
            .search-box input { padding: 8px; border-radius: 4px; border: 1px solid #ccc; width: 200px; }
            .btn-export { background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
            .btn-export:hover { background: #218838; }
            .empty-state { text-align: center; padding: 40px; color: #666; }
            
            @media (max-width: 600px) {
                th, td { padding: 8px; font-size: 14px; }
                .container { padding: 10px; }
            }
        </style>
    `;

    if (!data || data.length === 0) {
        return `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                ${css}
            </head>
            <body>
                <div class="container">
                    <h1>${title}</h1>
                    <div class="empty-state">
                        <h3>Oups! No hay datos para mostrar.</h3>
                        <p>No se encontraron registros para este periodo.</p>
                    </div>
                    <div class="footer">Generado por Negoc-IA Web</div>
                </div>
            </body>
            </html>
        `;
    }

    // Determine columns if not provided
    if (!columns || columns.length === 0) {
        columns = Object.keys(data[0]);
    }

    const rowsHtml = data.map(item => {
        let row = '<tr>';
        columns.forEach(col => {
            let val = item[col] !== undefined ? item[col] : '';

            // Simple formatting
            let valStr = String(val);
            if (typeof val === 'number') {
                if (col.toLowerCase().includes('price') || col.toLowerCase().includes('cost') || col.toLowerCase().includes('monto') || col.toLowerCase().includes('valor')) {
                    valStr = `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                } else if (col.toLowerCase().includes('stock') || col.toLowerCase().includes('qty') || col.toLowerCase().includes('cantidad')) {
                    valStr = val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
                }
            } else if (typeof val === 'boolean') {
                valStr = val ? 'Sí' : 'No';
            }

            row += `<td>${valStr}</td>`;
        });
        row += '</tr>';
        return row;
    }).join('');

    const headerHtml = columns.map(c => `<th>${c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>`).join('');



    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            ${css}
        </head>
        <body>
            <div class="container">
                <h1>${title}</h1>
                <p>Generado el ${new Date().toLocaleString('es-MX')}</p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div class="search-box">
                        <input type="text" id="searchInput" onkeyup="searchTable()" placeholder="🔍 Buscar...">
                    </div>
                    <button onclick="downloadCSV()" class="btn-export">⬇️ Descargar CSV</button>
                </div>

                <div style="overflow-x:auto;">
                    <table id="dataTable">
                        <thead>
                            <tr>
                                ${headerHtml}
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
                
                <script>
                    function searchTable() {
                        var input, filter, table, tr, td, i, txtValue;
                        input = document.getElementById("searchInput");
                        filter = input.value.toUpperCase();
                        table = document.getElementById("dataTable");
                        tr = table.getElementsByTagName("tr");
                        for (i = 0; i < tr.length; i++) {
                            // Search all columns
                            var found = false;
                            td = tr[i].getElementsByTagName("td");
                            for (var j = 0; j < td.length; j++) {
                                if (td[j]) {
                                    txtValue = td[j].textContent || td[j].innerText;
                                    if (txtValue.toUpperCase().indexOf(filter) > -1) {
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            if (i > 0) { // Skip header
                                tr[i].style.display = found ? "" : "none";
                            }
                        }
                    }

                    function downloadCSV() {
                        var csv = [];
                        var rows = document.querySelectorAll("table tr");
                        
                        for (var i = 0; i < rows.length; i++) {
                            var row = [], cols = rows[i].querySelectorAll("td, th");
                            
                            for (var j = 0; j < cols.length; j++) 
                                row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
                            
                            csv.push(row.join(","));        
                        }

                        var csvFile = new Blob([csv.join("\\n")], {type: "text/csv"});
                        var downloadLink = document.createElement("a");
                        downloadLink.download = "${title}.csv";
                        downloadLink.href = window.URL.createObjectURL(csvFile);
                        downloadLink.style.display = "none";
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                    }
                </script>
                
                <div class="footer">
                    Reporte generado por Negoc-IA Web
                </div>
            </div>
        </body>
        </html>
    `;

    return html;
};

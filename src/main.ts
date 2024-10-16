import './styles.css'
import * as XLSX from 'xlsx';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

interface Snippet {
    language: string;
    code: string;
    description: string;
}

let snippets: Snippet[] = [];
let currentPage = 1;
const snippetsPerPage = 5;

async function loadSnippets() {
    try {
        const response = await fetch('/snippets.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Iterar sobre todas las hojas (lenguajes)
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: ['code', 'description'] });
            
            // Saltamos la primera fila si contiene encabezados
            const snippetsFromSheet = data.slice(1).map(row => ({
                language: sheetName.toLowerCase(),
                code: (row as any).code || '',
                description: (row as any).description || ''
            }));
            
            snippets = snippets.concat(snippetsFromSheet);
        });

        console.log('Snippets cargados:', snippets);
    } catch (error) {
        console.error('Error al cargar los snippets:', error);
    }
}

function searchSnippets(language: string, query: string): Snippet[] {
    return snippets.filter(snippet => 
        snippet.language.toLowerCase() === language.toLowerCase() &&
        (snippet.description.toLowerCase().includes(query.toLowerCase()) ||
         snippet.code.toLowerCase().includes(query.toLowerCase()))
    );
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadSnippets();

    const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement;
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const resultsDisplay = document.getElementById('resultsDisplay') as HTMLDivElement;
    const paginationContainer = document.getElementById('pagination') as HTMLDivElement;
    const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;

    // Poblar el selector de lenguajes dinámicamente
    const uniqueLanguages = [...new Set(snippets.map(s => s.language))];
    languageSelect.innerHTML = uniqueLanguages.map(lang => 
        `<option value="${lang}">${lang.charAt(0).toUpperCase() + lang.slice(1)}</option>`
    ).join('');

    function performSearch() {
        const selectedLanguage = languageSelect.value;
        const searchTerm = searchInput.value;
        
        console.log(`Buscando: ${searchTerm} en ${selectedLanguage}`);
        
        const results = searchSnippets(selectedLanguage, searchTerm);
        console.log('Snippets encontrados:', results);
        displayResults(results);
    }

    searchInput.addEventListener('input', performSearch);
    languageSelect.addEventListener('change', performSearch);

    function displayResults(filteredSnippets: Snippet[]) {
        const startIndex = (currentPage - 1) * snippetsPerPage;
        const endIndex = startIndex + snippetsPerPage;
        const snippetsToDisplay = filteredSnippets.slice(startIndex, endIndex);

        if (snippetsToDisplay.length === 0) {
            resultsDisplay.innerHTML = '<p>No se encontraron resultados. Intenta con una búsqueda diferente.</p>';
            paginationContainer.innerHTML = '';
            return;
        }

        let resultsHTML = '';
        snippetsToDisplay.forEach((snippet, index) => {
            resultsHTML += `
                <div class="snippet">
                    <h3>${escapeHtml(snippet.description)}</h3>
                    <pre><code class="language-${snippet.language}">${escapeHtml(snippet.code)}</code></pre>
                    <button class="copy-btn" data-index="${startIndex + index}">Copiar código</button>
                </div>
            `;
        });

        resultsDisplay.innerHTML = resultsHTML;

        // Aplicar resaltado de sintaxis
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block as HTMLElement);
        });

        // Configurar botones de copiar
        document.querySelectorAll('.copy-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const index = parseInt((e.target as HTMLElement).getAttribute('data-index') || '0');
                const code = filteredSnippets[index].code;
                navigator.clipboard.writeText(code).then(() => {
                    alert('Código copiado al portapapeles');
                });
            });
        });

        // Crear paginación
        const totalPages = Math.ceil(filteredSnippets.length / snippetsPerPage);
        let paginationHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        paginationContainer.innerHTML = paginationHTML;

        // Configurar botones de paginación
        document.querySelectorAll('.page-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                currentPage = parseInt((e.target as HTMLElement).getAttribute('data-page') || '1');
                displayResults(filteredSnippets);
            });
        });
    }

    function escapeHtml(unsafe: string): string {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // Tema oscuro
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-moon');
            icon.classList.toggle('fa-sun');
        }
    });

    // Realizar búsqueda inicial
    performSearch();
});

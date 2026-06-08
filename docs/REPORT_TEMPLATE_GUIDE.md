# Report Template Guidelines (Standardized)

This document serves as the absolute standard for generating ALL printable and exportable reports in the system. Any future AI agent instructed to "create a report" MUST follow exactly this format, structure, and CSS logic.

## 1. Export Modal UI
Reports must be wrapped in a modal (e.g., `ExportModal.tsx`) with the following features:
- **Settings Toggle**: A button to open a settings panel to configure the report's Header, Footer, Logo, and Roles.
- **Export Buttons**: 
  - 🖨️ Print (`window.print()`)
  - 📄 PDF (using `html2pdf.js`)
  - 📊 Excel (using `xlsx` library `aoa_to_sheet`)
  - 📝 Word (using `docx` library)

## 2. Print Layout Structure & CSS Trick
To prevent browser printing bugs (e.g., clipped pages, blank pages, orphaned signatures), the print area must be rendered using a React Portal directly to `document.body` when printing.

### CSS Global Requirements (`@media print`):
```css
@media print {
  @page { size: A4 landscape; margin: 0; } /* margin: 0 removes browser URL/Dates */
  body { background: #fff !important; margin: 0; padding: 0; }
  body > :not(#export-print-area) { display: none !important; }
  #export-print-area { display: block !important; background: #fff; color: #000; padding: 10mm; width: 100%; box-sizing: border-box; }
}
#export-print-area { display: none; }

.pdfMode {
  display: block !important;
  position: absolute !important;
  top: -9999px !important;
  left: -9999px !important;
  width: 297mm !important; /* A4 landscape width */
  padding: 10mm !important;
  box-sizing: border-box !important;
  background: #fff !important;
}
```

## 3. Table and Pagination Flow
**Crucial Rule**: Do NOT force pagination using multiple `tbody` tags or `break-inside: avoid` on large blocks, as this causes half-empty blank pages.
- Render the table with a **single** `<tbody>`.
- The signature block MUST be the very last row (`<tr>`) of the table spanning all columns (`colSpan`).
- Apply `pageBreakInside: 'avoid', breakInside: 'avoid'` ONLY to the final signature `<tr>`.

```tsx
<tbody>
  {data.map((row, i) => (
    <tr key={i}>...</tr>
  ))}
  <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
    <td colSpan={columns.length} style={{ border: 'none', padding: 0 }}>
       {/* Summary and Signatures go here */}
    </td>
  </tr>
</tbody>
```

## 4. PDF Generation (`html2pdf.js`)
When saving directly to PDF, use the `.pdfMode` class to temporarily display the element off-screen to avoid visual glitches.

```javascript
const handlePdf = async () => {
  const html2pdf = (await import('html2pdf.js')).default;
  const element = document.getElementById('export-print-area');
  element.classList.add(styles.pdfMode);

  const opt = {
    margin: 0, // Handled by CSS padding: 10mm
    filename: 'report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, windowWidth: 1122 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' } // Crucial to prevent sliced rows
  };

  await html2pdf().set(opt).from(element).save();
  element.classList.remove(styles.pdfMode);
};
```

## 5. Khmer Typography & Aesthetics
- All headers, titles, and signatures must use Khmer OS fonts (e.g., `Khmer OS Muol Light`, `Khmer OS Battambang`).
- The left signature is always prefixed with `បានឃើញ និងឯកភាព` (Seen and Approved).
- Dates must use standard Lunar and Solar date formats dynamically generated.

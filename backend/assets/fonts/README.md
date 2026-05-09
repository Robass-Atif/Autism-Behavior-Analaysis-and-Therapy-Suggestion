# PDF Embedded Fonts

`PdfGeneratorService` looks for the following TTFs at runtime and registers
them under PDFKit's built-in font names so all existing `.font("Helvetica")`
/ `.font("Helvetica-Bold")` calls pick up the embedded version automatically:

| File              | Registered as   |
| ----------------- | --------------- |
| Inter-Regular.ttf | Helvetica       |
| Inter-Bold.ttf    | Helvetica-Bold  |

If neither file is present the service falls back to PDFKit's built-in
Helvetica (WinAnsi-only). With the TTFs in place, full Unicode glyphs
render correctly and the historical "DEMOGRAPHICS"->"DENOGRAPHICS"
corruption no longer occurs even when patient data contains accented
characters.

To install Inter:
1. Download Inter from <https://rsms.me/inter/> (OFL-licensed).
2. Drop `Inter-Regular.ttf` and `Inter-Bold.ttf` into this directory.
3. Restart the backend; no code changes needed.

Roboto is an equally good drop-in substitute — rename the TTFs to the
filenames in the table above and they will be picked up.

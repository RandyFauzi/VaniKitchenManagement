# System Information - VaniKitchenManagement

## 1) Ringkasan Proyek
Aplikasi ini adalah sistem manajemen dapur berbasis **single-page app** (SPA) dalam satu file HTML (`VaniKitchenManagement.html`) dengan backend **Google Apps Script** (`apps_script.js`) yang menyimpan data ke Google Sheets.

Domain utama:
- Purchase Request (PR)
- Daily Report
- Stock Menu & Bahan
- Buku Resep
- Jadwal Menu Bulanan
- Riwayat data + cetak dokumen

## 2) Struktur File dan Folder
- `VaniKitchenManagement.html`
  - UI, styling, modal, print template, dan seluruh logic frontend (inline JavaScript).
- `apps_script.js`
  - Endpoint REST-like (GET/POST) untuk CRUD data ke Google Sheets + upload gambar resep ke Google Drive.
- `assets/`
  - Saat ini tidak berisi file aktif.
- `logo-vanikithcen.png`, `logo-vanikithcen.webp`
  - Aset branding.

## 3) Arsitektur dan Interaksi

### 3.1 Arsitektur Umum
- Frontend: HTML + Tailwind CDN + JS vanilla inline.
- Backend: Google Apps Script Web App (`APPS_SCRIPT_URL`).
- Data store: Google Sheets (beberapa sheet terpisah per domain).
- Media store: Google Drive folder `Vani_Resep_Images` untuk gambar resep.

### 3.2 Pola Interaksi Data
- Frontend memanggil `fetch(APPS_SCRIPT_URL + "?type=...")` untuk READ.
- Frontend memanggil `fetch(APPS_SCRIPT_URL, { method:'POST', body: JSON.stringify(payload) })` untuk CREATE/UPDATE/DELETE.
- Backend memilah request dengan `type` (`pr|daily|stok|resep|jadwal`) dan `action` (`save|delete`).

### 3.3 Dependensi Eksternal
- `https://cdn.tailwindcss.com`
- Google Fonts (`Nunito`, `Quicksand`)
- Google Apps Script runtime service:
  - `SpreadsheetApp`, `DriveApp`, `Utilities`, `ContentService`

## 4) Fitur Utama dan Logic Flow

### 4.1 Navigasi Tab Utama
View utama:
- Form (`view-form`) -> subtab PR dan Jadwal
- Daily (`view-daily`)
- History (`view-history`) -> subtab PR/Daily/Jadwal
- Stock (`view-stock`) -> subtab Menu/Bahan
- Resep (`view-resep`)

Flow:
1. Klik nav -> `setActiveTab(tabName)`
2. Update state visual nav + panel
3. Lazy-load data saat perlu (`fetchHistory`, `fetchResep`, `fetchJadwal`)

### 4.2 Purchase Request (PR)
Flow create/edit:
1. `initFormPR()` set default tanggal + 5 baris item
2. User tambah item via `createRowPR()`
3. Submit `main-form` -> payload `type:'pr', action:'save'`
4. `sendData()` POST backend
5. Refresh history (`fetchHistory()`), tampil toast

Flow edit/delete/print dari history:
- Edit: `editDataPR(id)` mengisi ulang form
- Delete: `deleteData('pr', id)`
- Print: `printDataPR(id)` ke section print dan `window.print()`

### 4.3 Daily Report
Flow create/edit:
1. `initDailyForm()` generate ID harian (`RPT-YYYYMMDD`), tanggal, reset pekerjaan/menu
2. Pilih menu dari modal picker:
   - `openMenuPickerModal()`
   - `renderMenuPicker()`
   - `adjustPickerQty()`
   - `applyDailyMenuSelection()`
3. Tambah pekerjaan (`addPekerjaanRow`)
4. Submit `daily-form` -> payload `type:'daily', action:'save'`

Flow edit/delete/print:
- Edit: `editDataDaily(id)`
- Delete: `deleteData('daily', id)`
- Print: `printDataDaily(id)`

### 4.4 Riwayat Dokumen
Flow:
1. `fetchHistory()` GET `?type=history` (default branch di backend)
2. Isi `dbRiwayatPR` dan `dbRiwayatDaily`
3. Render tabel PR (`renderHistoryPR`) dan Daily (`renderHistoryDaily`)
4. Untuk Jadwal, render card history via `renderJadwalHistList()`

### 4.5 Manajemen Stok
Data kategori:
- `makanan`, `snack`, `bahan_dapur`, `bahan_kafe`

Flow:
1. `fetchStockData()` GET `?type=stok`
2. Render per panel (`renderStockCategory`, `renderStockList`)
3. Ubah jumlah (`updateStock`), tambah item (`submitAddMenu`), hapus item (`deleteStockItem`)
4. Persist semua state stok via `saveStockData()` POST `type:'stok', action:'save'`
5. Cetak laporan:
   - `printStockMenu()`
   - `printStockBahan()`

### 4.6 Buku Resep
Flow list/filter/detail:
1. `fetchResep()` GET `?type=resep`
2. `renderRecipes()` dengan search + filter kategori
3. `openDetailResep(id)` menampilkan bahan/langkah/notes

Flow create/edit:
1. `openFormResep(id?)`
2. Dynamic field bahan (`addBahanRow`) & langkah (`addListRow`)
3. Upload image lokal -> `handleImageSelect()` kompres ke base64
4. Submit -> `submitFormResep()` POST `type:'resep', action:'save'`
5. Jika `IN_STOCK=true`, sinkron stok menu terkait kategori makanan/snack

Flow delete:
- `deleteCurrentResep()` POST `type:'resep', action:'delete'`

### 4.7 Jadwal Menu Bulanan
Flow list:
1. `fetchJadwal()` GET `?type=jadwal`
2. `renderJadwalList()` tampil card periode

Flow create/edit:
1. `openNewJadwal()` atau `openEditJadwal(id)`
2. Generate row harian per bulan (`generateJadwalRows`)
3. Render row (`renderJadwalRows`) + opsi highlight (`toggleHighlightRow`)
4. Simpan (`saveJadwal`) POST `type:'jadwal', action:'save'`

Flow delete/print:
- `deleteJadwal(id)`
- `printJadwal(id)`

## 5) State Management dan Variabel Penting
State global frontend:
- `APPS_SCRIPT_URL`: endpoint backend.
- `dbRiwayatPR`: cache riwayat PR.
- `dbRiwayatDaily`: cache riwayat daily.
- `dbResep`: cache resep.
- `dbJadwal`: cache jadwal.
- `currentResepId`: ID resep aktif saat edit/detail.
- `activeResepFilter`: filter kategori resep aktif.
- `stockState`: object stok 4 kategori.
- `tempDailyMenuSelection`: buffer pilihan menu di modal Daily.
- `currentEditingJadwalId`: ID jadwal yang sedang diedit.
- `units`: master satuan PR.
- `BULAN_NAMES`, `HARI_NAMES`: mapping display kalender.

Persistensi lokal browser:
- `localStorage['welcome_popup_time']`: cooldown popup welcome.

Pola manajemen state:
- Mutasi state object global -> panggil render ulang area terkait.
- Fetch ulang dari backend setelah operasi penting (history/resep/jadwal/stok) untuk konsistensi.

## 6) Daftar Fungsi Frontend dan Kegunaan

### 6.1 Navigasi, UI util, dan tab
- `setStatus(text, show)`: menampilkan status badge.
- `setActiveTab(tabName)`: switch tab utama + lazy load.
- `switchFormTab(tab)`: switch subtab Form (PR/Jadwal).
- `switchHistoryTab(tab)`: switch subtab History.
- `switchStokTab(tab)`: switch subtab Stok.
- `showLoading(text)`, `hideLoading()`: overlay loading.
- `showToast(msg, type)`: notifikasi toast.
- `showConfirm(message)`: modal konfirmasi Promise<boolean>.
- `initWelcomePopup()`, `closeWelcomeModal()`: popup welcome periodik.

### 6.2 Purchase Request
- `initFormPR()`: inisialisasi form PR default.
- `createRowPR(desc, qty, unit, remark)`: tambah row item PR.
- `updateNoPR()`: renumber baris item.
- `sendData(payload, successMsg)`: helper POST generic.
- `editDataPR(id)`: load data PR ke form.
- `printDataPR(id)`: format data PR ke template print.

### 6.3 Daily Report
- `getTodayDateStr()`: tanggal hari ini format input.
- `getGeneratedDailyId()`: generator ID report.
- `initDailyForm(isEdit)`: reset/isi daily form.
- `addPekerjaanRow(val)`: tambah checklist pekerjaan.
- `openMenuPickerModal()`, `closeDailyMenuModal()`: modal pilih menu.
- `renderMenuPicker(category, containerId)`: render item menu picker.
- `adjustPickerQty(item, change)`: ubah qty item di modal.
- `applyDailyMenuSelection()`: commit pemilihan menu.
- `renderDailyMenuSelection()`: render ringkasan menu dipilih.
- `editDataDaily(id)`: load daily ke form.
- `printDataDaily(id)`: cetak daily report.

### 6.4 History
- `fetchHistory()`: ambil riwayat PR + Daily.
- `renderHistoryPR()`: render tabel riwayat PR.
- `renderHistoryDaily()`: render tabel riwayat Daily.
- `deleteData(type, id)`: hapus data PR/Daily.

### 6.5 Stock
- `fetchStockData()`: ambil data stok.
- `updateStock(category, item, change)`: increment/decrement stok item.
- `renderStockCategory(category, containerId)`: render kartu stok per kategori.
- `renderStockList()`: render semua kategori stok.
- `deleteStockItem(category, item)`: hapus item stok.
- `saveStockData()`: simpan state stok ke backend.
- `openAddMenuModal()`, `closeAddMenuModal()`: modal tambah item stok.
- `adjustModalQty(id, change)`: stepper qty modal tambah stok.
- `submitAddMenu(e)`: submit item stok baru.
- `printStockMenu()`: cetak stok menu.
- `printStockBahan()`: cetak stok bahan.

### 6.6 Resep
- `getDirectImageUrl(url)`: konversi URL Drive ke direct view.
- `fetchResep()`: ambil list resep.
- `filterResep(cat, btn)`: set filter kategori resep.
- `renderRecipes()`: render card resep.
- `openDetailResep(id)`, `closeDetailResep()`: detail resep.
- `openFormResep(id)`, `closeFormResep()`: form create/edit resep.
- `addBahanRow(obj)`: tambah row bahan.
- `addListRow(type, val)`: tambah row list langkah (dan list lain).
- `handleImageSelect(e)`: kompres gambar dan simpan base64.
- `removeSelectedImage()`: reset image input.
- `submitFormResep(e)`: simpan resep + sinkron stok jika perlu.
- `deleteCurrentResep()`: hapus resep.

### 6.7 Jadwal
- `getMergedMenuArray(item)`: normalisasi schema jadwal lama/baru.
- `renderJadwalHistList()`: render history jadwal.
- `fetchJadwal()`: ambil data jadwal.
- `renderJadwalList()`: render list jadwal aktif.
- `openNewJadwal()`: mode buat jadwal baru.
- `openEditJadwal(id)`: mode edit jadwal.
- `backToJadwalList()`: kembali ke list jadwal.
- `generateJadwalRows()`: generate hari dalam bulan terpilih.
- `renderJadwalRows(rows)`: render row jadwal harian.
- `toggleHighlightRow(checkbox)`: toggle penanda highlight.
- `collectJadwalData()`: ekstraksi data row jadwal dari DOM.
- `saveJadwal()`: validasi + simpan jadwal.
- `deleteJadwal(id)`: hapus jadwal.
- `printJadwal(id)`: cetak jadwal.

## 7) Backend (`apps_script.js`) - Fungsi dan Tanggung Jawab
Konfigurasi sheet:
- `sheetPRName = "Data_PR"`
- `sheetStokName = "data_stok"`
- `sheetJadwalName = "Data_Jadwal_Menu"`
- `sheetDailyName = "Data_Daily_Report"`
- `sheetResepName = "Data_Resep"`

Fungsi:
- `doGet(e)`
  - `type=stok`: baca sheet stok 8 kolom -> map object 4 kategori.
  - `type=resep`: baca semua baris resep.
  - `type=jadwal`: baca semua baris jadwal.
  - default/history: gabungkan data PR + Daily.
- `doPost(e)`
  - Parse JSON body, route by `type` + `action`.
  - `type=jadwal`: upsert/delete by `ID_JADWAL`.
  - `type=stok`: overwrite total sheet stok dari `stockState`.
  - `type=pr`: upsert/delete by `ID_PR`.
  - `type=daily`: upsert/delete by `ID_REPORT`, auto-create sheet jika belum ada.
  - `type=resep`: upsert/delete by `ID_RESEP`, upload base64 image ke Google Drive jika ada.

## 8) Data Model Utama

### 8.1 PR (`Data_PR`)
- `ID_PR`
- `TGL_REQUEST`
- `TGL_BUTUH`
- `DEPARTEMEN`
- `DATA_BARANG` (JSON array item `{desc, qty, unit, remark}`)

### 8.2 Daily (`Data_Daily_Report`)
- `ID_REPORT`
- `TANGGAL`
- `SHIFT`
- `DATA_MENU` (JSON array `{nama, qty}`)
- `DATA_PEKERJAAN` (JSON array string)

### 8.3 Stok (`data_stok`)
- 8 kolom paralel:
  - makanan (nama, qty)
  - snack (nama, qty)
  - bahan_dapur (nama, qty)
  - bahan_kafe (nama, qty)

### 8.4 Resep (`Data_Resep`)
- `ID_RESEP`
- `NAMA_MENU`
- `KATEGORI`
- `URL_GAMBAR`
- `DESKRIPSI`
- `BAHAN` (JSON array objek)
- `LANGKAH` (JSON array string)
- `NOTES`
- `IN_STOCK` (boolean/string)

### 8.5 Jadwal (`Data_Jadwal_Menu`)
- `ID_JADWAL`
- `PERIODE` (contoh: `Mei 2026`)
- `MENU_MASAKAN` (JSON array harian)
- `MENU_SAYUR` (JSON array harian)
- `CATATAN_BAWAH`

## 9) Interaksi Antar Modul
- Resep <-> Stok:
  - Saat resep disimpan dengan `IN_STOCK=true`, item resep bisa ditambahkan ke `stockState` kategori makanan/snack jika belum ada.
- Daily <-> Stok:
  - Pemilihan menu Daily mengambil sumber dari `stockState` kategori makanan/snack.
- History:
  - Riwayat PR dan Daily ditarik bersamaan dari endpoint default.
- Jadwal:
  - Tab Form dan History sama-sama mereferensikan cache `dbJadwal`.

## 10) Catatan Implementasi Teknis
- Proyek saat ini berorientasi **monolit frontend** (semua logic dalam satu file HTML).
- Tidak ada class JavaScript; pola yang dipakai adalah fungsi global + state global.
- Tidak ada bundler/module system; tidak ada package manager dependency lokal.
- `assets/js` kosong, sehingga `apps_script.js` kemungkinan digunakan untuk deployment ke Google Apps Script, bukan dieksekusi langsung browser.

## 11) Ringkasan Kritis untuk Maintenance
- Titik sentral integrasi backend: `APPS_SCRIPT_URL`.
- Titik rawan regresi: serialisasi/deserialisasi JSON (`DATA_*`, `BAHAN`, `LANGKAH`, jadwal).
- Sinkronisasi UI bergantung pada urutan: mutate state -> render -> (opsional) save/fetch ulang.
- Kompatibilitas data jadwal lama/baru ditangani oleh `getMergedMenuArray`.

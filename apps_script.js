const sheetPRName = "Data_PR";
const sheetStokName = "data_stok";
const sheetJadwalName = "Data_Jadwal_Menu";
const sheetDailyName = "Data_Daily_Report";
const sheetResepName = "Data_Resep";

// Fungsi untuk MENGAMBIL data (GET)
function doGet(e) {
  const type = (e.parameter.type || 'pr').toLowerCase();

  if (type === 'stok') {
    // Ambil Data Stok (6 Kolom: Makanan, Snack, Bahan Operational Dapur)
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetStokName);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet data_stok tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: { makanan: {}, snack: {}, bahan_dapur: {} } })).setMimeType(ContentService.MimeType.JSON);
    }

    const rows = data.slice(1); // Lewati header
    let result = { makanan: {}, snack: {}, bahan_dapur: {} };

    rows.forEach(row => {
      // Kolom A (0) & B (1) -> Makanan
      if (row[0]) result.makanan[row[0]] = Number(row[1]) || 0;
      // Kolom C (2) & D (3) -> Snack
      if (row[2]) result.snack[row[2]] = Number(row[3]) || 0;
      // Kolom E (4) & F (5) -> Bahan Operational Dapur
      if (row[4]) result.bahan_dapur[row[4]] = Number(row[5]) || 0;
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } else if (type === 'resep') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetResepName);
    let dataResep = [];
    if (sheet) {
      const raw = sheet.getDataRange().getValues();
      if (raw.length > 1) {
        const headers = raw[0];
        dataResep = raw.slice(1).map(row => {
          let obj = {};
          headers.forEach((h, i) => obj[h] = row[i]);
          return obj;
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: dataResep })).setMimeType(ContentService.MimeType.JSON);
  } else if (type === 'jadwal') {
    // Ambil Data Jadwal Menu
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetJadwalName);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet Data_Jadwal_Menu tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: [] })).setMimeType(ContentService.MimeType.JSON);

    const headers = data[0];
    const rows = data.slice(1);
    const result = rows.map(row => {
      let obj = {};
      headers.forEach((header, i) => { obj[header] = row[i]; });
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result })).setMimeType(ContentService.MimeType.JSON);

  } else {
    // Ambil Data Riwayat PR & Daily (Merge Request history)
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Fetch PR
    let dataPR = [];
    const sheetPR = ss.getSheetByName(sheetPRName);
    if (sheetPR) {
      const rawPR = sheetPR.getDataRange().getValues();
      if (rawPR.length > 1) {
        const headers = rawPR[0];
        dataPR = rawPR.slice(1).map(row => {
          let obj = {};
          headers.forEach((h, i) => obj[h] = row[i]);
          return obj;
        });
      }
    }

    // 2. Fetch Daily Report
    let dataDaily = [];
    const sheetDaily = ss.getSheetByName(sheetDailyName);
    if (sheetDaily) {
      const rawDaily = sheetDaily.getDataRange().getValues();
      if (rawDaily.length > 1) {
        const headers = rawDaily[0];
        dataDaily = rawDaily.slice(1).map(row => {
          let obj = {};
          headers.forEach((h, i) => obj[h] = row[i]);
          return obj;
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      dataPR: dataPR,
      dataDaily: dataDaily
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Fungsi untuk MENYIMPAN (Create/Update) atau MENGHAPUS data
function doPost(e) {
  let requestBody;
  try {
    requestBody = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid JSON' })).setMimeType(ContentService.MimeType.JSON);
  }

  const action = requestBody.action; // 'save' atau 'delete'
  const data = requestBody.data;
  const type = (requestBody.type || 'pr').toLowerCase();

  // === HANDLER UNTUK JADWAL MENU ===
  if (type === 'jadwal') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetJadwalName);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet Data_Jadwal_Menu tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);

    if (action === 'delete') {
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] == data.ID_JADWAL) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Jadwal dihapus' })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    if (action === 'save') {
      const rows = sheet.getDataRange().getValues();
      let isUpdate = false;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] == data.ID_JADWAL) {
          // Update columns B, C, D, E (index 2, 3, 4, 5 in 1-based indexing)
          sheet.getRange(i + 1, 2, 1, 4).setValues([[data.PERIODE, data.MENU_MASAKAN, data.MENU_SAYUR, data.CATATAN_BAWAH]]);
          isUpdate = true;
          break;
        }
      }
      if (!isUpdate) {
        sheet.appendRow([data.ID_JADWAL, data.PERIODE, data.MENU_MASAKAN, data.MENU_SAYUR, data.CATATAN_BAWAH]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Jadwal tersimpan' })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // === HANDLER UNTUK STOK MENU ===
  else if (type === 'stok') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetStokName);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet data_stok tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);

    if (action === 'save') {
      sheet.clear();
      // Header 6 kolom
      sheet.appendRow([
        "NAMA_MENU_MAKANAN", "JUMLAH_STOK_MAKANAN",
        "NAMA_MENU_SNACK", "JUMLAH_STOK_SNACK",
        "NAMA_BAHAN_OPERATIONAL_DAPUR", "JUMLAH_STOK_BAHAN_OPERATIONAL_DAPUR"
      ]);

      const dataMakanan = data.makanan || {};
      const dataSnack = data.snack || {};
      const dataBahanDapur = data.bahan_dapur || {};

      const makananEntries = Object.entries(dataMakanan);
      const snackEntries = Object.entries(dataSnack);
      const bahanDapurEntries = Object.entries(dataBahanDapur);

      const maxRows = Math.max(makananEntries.length, snackEntries.length, bahanDapurEntries.length);
      const rows = [];

      for (let i = 0; i < maxRows; i++) {
        const mName = makananEntries[i] ? makananEntries[i][0] : "";
        const mQty  = makananEntries[i] ? makananEntries[i][1] : "";
        const sName = snackEntries[i] ? snackEntries[i][0] : "";
        const sQty  = snackEntries[i] ? snackEntries[i][1] : "";
        const bdName = bahanDapurEntries[i] ? bahanDapurEntries[i][0] : "";
        const bdQty  = bahanDapurEntries[i] ? bahanDapurEntries[i][1] : "";
        rows.push([mName, mQty, sName, sQty, bdName, bdQty]);
      }

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 6).setValues(rows);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Stok Tersimpan' })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // === HANDLER UNTUK DATA PR ===
  else if (type === 'pr') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetPRName);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet Data_PR tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);

    if (action === 'delete') {
      const dataRange = sheet.getDataRange().getValues();
      for (let i = 1; i < dataRange.length; i++) {
        if (dataRange[i][0] == data.ID_PR) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Terhapus' })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    if (action === 'save') {
      const dataRange = sheet.getDataRange().getValues();
      let isUpdate = false;

      for (let i = 1; i < dataRange.length; i++) {
        if (dataRange[i][0] == data.ID_PR) {
          sheet.getRange(i + 1, 2, 1, 4).setValues([[data.TGL_REQUEST, data.TGL_BUTUH, data.DEPARTEMEN, data.DATA_BARANG]]);
          isUpdate = true;
          break;
        }
      }
      if (!isUpdate) {
        sheet.appendRow([data.ID_PR, data.TGL_REQUEST, data.TGL_BUTUH, data.DEPARTEMEN, data.DATA_BARANG]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'PR Tersimpan' })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // === HANDLER UNTUK DATA DAILY REPORT ===
  else if (type === 'daily') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetDailyName);
    if (!sheet) {
      const newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetDailyName);
      newSheet.appendRow(["ID_REPORT", "TANGGAL", "SHIFT", "DATA_MENU", "DATA_PEKERJAAN"]);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Sheet dibuat ulang, silakan simpan kembali.' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete') {
      const dataRange = sheet.getDataRange().getValues();
      for (let i = 1; i < dataRange.length; i++) {
        if (dataRange[i][0] == data.ID_REPORT) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Terhapus' })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    if (action === 'save') {
      const dataRange = sheet.getDataRange().getValues();
      let isUpdate = false;

      for (let i = 1; i < dataRange.length; i++) {
        if (dataRange[i][0] == data.ID_REPORT) {
          sheet.getRange(i + 1, 2, 1, 4).setValues([[data.TANGGAL, data.SHIFT, data.DATA_MENU, data.DATA_PEKERJAAN]]);
          isUpdate = true;
          break;
        }
      }
      if (!isUpdate) {
        sheet.appendRow([data.ID_REPORT, data.TANGGAL, data.SHIFT, data.DATA_MENU, data.DATA_PEKERJAAN]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Daily Report Tersimpan' })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // === HANDLER UNTUK DATA RESEP ===
  else if (type === 'resep') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetResepName);
    if (!sheet) {
      const newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetResepName);
      newSheet.appendRow(["ID_RESEP", "NAMA_MENU", "KATEGORI", "URL_GAMBAR", "DESKRIPSI", "BAHAN", "LANGKAH", "NOTES", "IN_STOCK"]);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Sheet resep dibuat. Coba simpan kembali.' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete') {
      const dataRange = sheet.getDataRange().getValues();
      for (let i = 1; i < dataRange.length; i++) {
        if (dataRange[i][0] == data.ID_RESEP) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Resep terhapus' })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    if (action === 'save') {
      const dataRange = sheet.getDataRange().getValues();
      let isUpdate = false;

      let finalUrl = data.URL_GAMBAR;
      if (data.IMAGE_BASE64) {
        try {
          const parts = data.IMAGE_BASE64.split(',');
          const mime = parts[0].match(/:(.*?);/)[1];
          const b64Data = parts[1];
          const blob = Utilities.newBlob(Utilities.base64Decode(b64Data), mime, data.NAMA_MENU + '_' + data.ID_RESEP);

          let folder;
          const folders = DriveApp.getFoldersByName("Vani_Resep_Images");
          if (folders.hasNext()) { folder = folders.next(); }
          else { folder = DriveApp.createFolder("Vani_Resep_Images"); }

          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

          // Fallback to older getUrl() if getDownloadUrl() isn't desired, but getUrl is safer for viewing.
          finalUrl = file.getUrl();
        } catch (err) {
          // If image upload fails, keep the old url or blank
        }
      }

      for (let i = 1; i < dataRange.length; i++) {
        if (dataRange[i][0] == data.ID_RESEP) {
          sheet.getRange(i + 1, 2, 1, 8).setValues([[data.NAMA_MENU, data.KATEGORI, finalUrl, data.DESKRIPSI, data.BAHAN, data.LANGKAH, data.NOTES, data.IN_STOCK]]);
          isUpdate = true;
          break;
        }
      }
      if (!isUpdate) {
        sheet.appendRow([data.ID_RESEP, data.NAMA_MENU, data.KATEGORI, finalUrl, data.DESKRIPSI, data.BAHAN, data.LANGKAH, data.NOTES, data.IN_STOCK]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Resep Tersimpan' })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Fallback
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Action/Type tidak dikenali' })).setMimeType(ContentService.MimeType.JSON);
}

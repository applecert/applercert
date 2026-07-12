// =========================================================================
// HƯỚNG DẪN CẬP NHẬT GOOGLE APPS SCRIPT ĐỂ DẠY AI HỌC (Q&A DATABASE)
// =========================================================================
// Sếp hãy mở trình chỉnh sửa Google Apps Script của sếp lên,
// tìm đến hàm doGet(e) ở khoảng dòng 273.
// Tìm đoạn:
//    var ss = SpreadsheetApp.getActiveSpreadsheet();
//
// Và dán khối code ở phần 1 dưới đây vào ngay sau nó.
// Sau đó lưu dự án và Triển khai lại dưới dạng Web App, cấu hình truy cập: "Anyone".
// =========================================================================

// -------------------------------------------------------------------------
// PHẦN 1: KHỐI CODE CẦN CHÈN VÀO HÀM doGet(e)
// -------------------------------------------------------------------------

    // =========================================================
    // HÀNH ĐỘNG MỚI: TẢI DỮ LIỆU CÂU HỎI Q&A CHO TRỢ LÝ AI TỰ HỌC
    // =========================================================
    if (action === 'get_ai_qa') {
      var qaSheet = ss.getSheetByName("AI_Knowledge");
      
      // Tự động khởi tạo tab sheet mới và điền mẫu nếu chưa có
      if (!qaSheet) {
        qaSheet = ss.insertSheet("AI_Knowledge");
        qaSheet.appendRow(["Question", "Answer"]);
        qaSheet.appendRow(["lỗi cert", "Nếu gặp lỗi chứng chỉ bị thu hồi hoặc văng ứng dụng, sếp vui lòng gia hạn gói VIP mới để nhận chứng chỉ liên kết thiết bị mới, hoặc nhắn tin Admin t.me/ipaviet để mua Chứng Chỉ riêng (Cert Riêng) bảo hành trọn đời nhé!"]);
        qaSheet.appendRow(["cách cài vsign", "Để cài đặt ứng dụng VSign chính chủ, sếp truy cập trang: vsign.html và bấm 'Cài đặt trực tiếp', sau đó vào Cài đặt iOS > Quản lý VPN & Thiết bị để Tin cậy chứng chỉ là xong ạ."]);
        qaSheet.appendRow(["không tải được app", "Nếu tải app bị lỗi, sếp kiểm tra lại dung lượng trống của máy, hoặc kiểm tra xem tài khoản đã đăng ký VIP chưa nhé. Hội viên VIP sẽ tải được mọi app ở Kho VIP mượt mà."]);
        ss.flush();
      }
      
      var data = qaSheet.getDataRange().getValues();
      var qaList = [];
      
      // Đọc các dòng từ dòng số 2 trở đi
      for (var i = 1; i < data.length; i++) {
        var question = data[i][0] ? data[i][0].toString().trim() : "";
        var answer = data[i][1] ? data[i][1].toString().trim() : "";
        if (question !== "") {
          qaList.push({
            question: question,
            answer: answer
          });
        }
      }
      return output.setContent(JSON.stringify(qaList)).setHeader('Access-Control-Allow-Origin', '*');
    }

// -------------------------------------------------------------------------
// PHẦN 2: CÁCH ADMIN DẠY HỌC CHO AI QUA GOOGLE SHEETS
// -------------------------------------------------------------------------
// 1. Sau khi chạy thử tính năng chatbot lần đầu, Google Sheet của sếp sẽ tự động
//    xuất hiện thêm một tab trang tính mới tên là: "AI_Knowledge".
// 2. Tab này có 2 cột chính: Cột A (Question) và Cột B (Answer).
// 3. Sếp chỉ việc điền:
//    - Cột A: Các từ khóa câu hỏi người dùng hay hỏi (Ví dụ: "lỗi cài đặt", "bảo hành", "momo").
//    - Cột B: Câu trả lời tương ứng sếp muốn AI phản hồi.
// 4. AI trên web sẽ tự động đồng bộ hóa thời gian thực và trả lời khách hàng
//    theo đúng nội dung sếp đã dạy trên bảng tính đó.

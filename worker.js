
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API TẠO HÌNH MINH HỌA
    if (url.pathname === "/api/image") {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Chỉ hỗ trợ POST" },
          { status: 405 }
        );
      }

      try {
        const body = await request.json();
        const description = String(body.description || "").trim();
        const style = String(body.style || "Vẽ tay màu");

        if (!description || description.length > 1500) {
          return Response.json(
            { error: "Mô tả hình ảnh không hợp lệ." },
            { status: 400 }
          );
        }

        // Chuyển mô tả cảnh thành prompt hình ảnh rõ ràng.
        const translated = await env.AI.run(
          "@cf/meta/llama-3.2-3b-instruct",
          {
            messages: [
              {
                role: "system",
                content:
                  "You are an expert visual prompt writer for educational whiteboard illustrations. Convert the Vietnamese scene description into concise, literal English visual instructions. Preserve the exact subject, action, number of objects, and setting. Describe only what should be visible. Do not add unrelated objects, people, labels, captions, letters, or text. Return only the English visual description."
              },
              {
                role: "user",
                content: description
              }
            ],
            max_tokens: 220
          }
        );

        const visualDescription = String(
          translated.response || description
        ).trim();

        const prompt =
  "Create a beautiful full-color educational hand-drawn illustration. " +
  "Show exactly this scene: " + visualDescription + ". " +
  "Use vivid, natural, scientifically appropriate colors. " +
  "Color every main object and every visible detail completely. " +
  "Use clean, bold black ink outlines with smooth, consistent line thickness. " +
  "Use simple recognizable shapes, clear details and balanced composition. " +
  "Keep colors bright, harmonious and consistent across all illustrations. " +
  "Use a pure white background with no unnecessary decorations. " +
  "Never use black-and-white, grayscale, monochrome or pencil-only rendering. " +
  "No words, no letters, no numbers, no labels, " +
  "no captions, no watermark, no border. " +
  "Style: " + style + ".";

                // Chọn kích thước ảnh theo tỷ lệ video.
        const requestedRatio = String(body.aspectRatio || "16:9 YouTube");
        let width = 1280;
        let height = 720;

        if (requestedRatio.startsWith("9:16")) {
          width = 720;
          height = 1280;
        } else if (requestedRatio.startsWith("1:1")) {
          width = 1024;
          height = 1024;
        }

        // Tạo ảnh bằng FLUX.2 Klein 4B.
        const formData = new FormData();
        formData.append("prompt", prompt.slice(0, 2048));
        formData.append("width", String(width));
        formData.append("height", String(height));

        const multipartResponse = new Response(formData);

        const result = await env.AI.run(
  "@cf/black-forest-labs/flux-2-klein-4b",
          {
            multipart: {
              body: multipartResponse.body,
              contentType: multipartResponse.headers.get("content-type")
            }
          }
        );

        if (!result || !result.image) {
          throw new Error("Không nhận được hình ảnh từ AI.");
        }

        return Response.json({
          success: true,
          image: "data:image/jpeg;base64," + result.image
        });

      } catch (error) {
        return Response.json(
          { error: "Không tạo được hình: " + error.message },
          { status: 500 }
        );
      }
    }

    // API TẠO KỊCH BẢN
    if (url.pathname === "/api/generate") {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Chỉ hỗ trợ POST" },
          { status: 405 }
        );
      }

      try {
        const body = await request.json();
        const topic = String(body.topic || "").trim();
        const duration = String(body.duration || "5 phút");
        const format = String(body.format || "16:9");
        const voice = String(body.voice || "Giọng nữ");
        const style = String(body.style || "Vẽ tay màu").trim();

        if (!topic || topic.length > 1000) {
          return Response.json(
            { error: "Chủ đề phải có từ 1 đến 1000 ký tự." },
            { status: 400 }
          );
        }

        const result = await env.AI.run(
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          {
            messages: [
              {
                role: "system",
                content:
  "Bạn là biên kịch kiêm biên tập viên kiểm tra kiến thức cho video giáo dục bằng tiếng Việt. " +
  "Trước khi viết, hãy xác định chính xác chủ thể và phân loại khoa học của nó; không được đoán. " +
  "Phân biệt rõ các nhóm sinh vật như côn trùng, động vật có vú, chim, bò sát, lưỡng cư, cá và thực vật. " +
  "Chỉ sử dụng kiến thức phổ thông có độ tin cậy cao; không tự bịa tên loài, số liệu, cấu tạo hoặc hành vi. " +
  "Nếu không chắc chắn về chi tiết, hãy bỏ chi tiết đó hoặc diễn đạt thận trọng, tuyệt đối không khẳng định sai. " +
  "Kiểm tra lại tính nhất quán giữa tiêu đề, lời đọc và từng phân cảnh trước khi trả kết quả. " +
  "Mỗi trường drawing phải là mô tả hình ảnh cụ thể, sát với lời đọc, nêu rõ chủ thể, số lượng, đặc điểm nhận dạng, hành động và bố cục. " +
  "Mỗi cảnh chỉ có một hành động chính; không thêm chi tiết không có trong lời đọc. " +
  "Trả về JSON hợp lệ, không Markdown, theo cấu trúc: " +
  "{title:string, introduction:string, scenes:[{scene:number, narration:string, drawing:string, subtitle:string}], conclusion:string}."
              },
              {
                role: "user",
                content:
                  `Chủ đề: ${topic}\n` +
                  `Thời lượng: ${duration}\n` +
                  `Tỷ lệ: ${format}\n` +
                  `Giọng đọc: ${voice}\n` +
                  `Phong cách: ${style}\n` +
                  "Hãy tạo kịch bản chi tiết bằng tiếng Việt. " +
                  "Mỗi cảnh chỉ tập trung vào một hành động hoặc một ý chính."
              }
            ],
            max_tokens: 3000
          }
        );

        return Response.json({
          success: true,
          script: result.response || result
        });

      } catch (error) {
        return Response.json(
          { error: "Không tạo được kịch bản: " + error.message },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};

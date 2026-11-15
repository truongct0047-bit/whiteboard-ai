
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
        const style = String(body.style || "Vẽ tay trắng đen").trim();

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
          "Create a clear educational hand-drawn whiteboard illustration. " +
          "Show exactly this scene: " + visualDescription + ". " +
          "Use clean black ink outlines, simple recognizable shapes, " +
          "balanced composition, pure white background, " +
          "consistent line thickness, minimal visual clutter. " +
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
        const style = String(body.style || "Vẽ tay trắng đen");

        if (!topic || topic.length > 1000) {
          return Response.json(
            { error: "Chủ đề phải có từ 1 đến 1000 ký tự." },
            { status: 400 }
          );
        }

        const result = await env.AI.run(
          "@cf/meta/llama-3.2-3b-instruct",
          {
            messages: [
              {
                role: "system",
                content:
                  "Bạn là biên kịch video whiteboard animation bằng tiếng Việt. " +
                  "Hãy tạo kịch bản dễ hiểu, chính xác, hấp dẫn và chia thành các phân cảnh logic. " +
                  "Mỗi trường drawing phải mô tả một hình ảnh cụ thể, trực quan, có chủ thể và hành động rõ ràng. " +
                  "Không dùng mô tả trừu tượng hoặc chung chung. " +
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

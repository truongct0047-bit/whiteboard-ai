
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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

        const prompt =
          "A clean whiteboard animation illustration, black ink hand-drawn line art on a pure white background, simple educational infographic, bold smooth outlines, minimal details, no color, no text, no watermark. Style: " +
          style +
          ". Scene: " + description;

        const result = await env.AI.run(
          "@cf/black-forest-labs/flux-1-schnell",
          { prompt, steps: 4 }
        );

        if (!result || !result.image) {
          throw new Error("Không nhận được hình ảnh.");
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
                  "Bạn là biên kịch video whiteboard animation bằng tiếng Việt. Hãy tạo kịch bản dễ hiểu, hấp dẫn, chia thành các phân cảnh. Trả về JSON hợp lệ, không dùng Markdown, theo cấu trúc: {title:string, introduction:string, scenes:[{scene:number, narration:string, drawing:string, subtitle:string}], conclusion:string}. Nội dung phải phù hợp thời lượng yêu cầu."
              },
              {
                role: "user",
                content:
                  `Chủ đề: ${topic}\nThời lượng: ${duration}\nTỷ lệ: ${format}\nGiọng đọc: ${voice}\nPhong cách: ${style}\nHãy tạo kịch bản chi tiết bằng tiếng Việt.`
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

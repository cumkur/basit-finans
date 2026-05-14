import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Dosya bulunamadı" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const base64 = buffer.toString("base64");

    const mimeType = file.type || "image/png";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen bir Türk banka ve kredi kartı ekstresi OCR asistanısın. Görevin görseldeki işlem tablosundaki gerçek finans hareketlerini satır satır çıkarmaktır. Sadece geçerli JSON döndür.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
      Bu görseli analiz et ve sadece şu formatta JSON döndür:

      {
        "transactions": [
          {
            "date": "YYYY-MM-DD",
            "type": "income veya expense",
            "category": "Market | Yakıt | Kira | Fatura | Çocuk | Araç | Sağlık | Borç ödemesi | Yatırım | Maaş | Satış | Diğer",
            "account": "Türkiye hesabı",
            "amount": 123.45,
            "currency": "TRY",
            "description": "işlem açıklaması",
            "raw": "görseldeki ham satır"
          }
        ]
      }

      Çok önemli kurallar:
      - Bu belge Türk bankası kredi kartı hesap özeti olabilir.
      - Tabloda TUTAR sütunu TL ise tüm işlemler TRY olmalı.
      - Açıklamada EUR, USD, DUBLIN, FRANKFURT, APPLE.COM yazması currency değerini değiştirmez.
      - "23 EUR SATIŞ" veya "29,99 EUR SATIŞ" açıklamadır; ana işlem tutarı TUTAR sütunundaki TL değeridir.
      - İşlem tablosundaki her gerçek hareketi ayrı transaction yap.
      - Sadece 2-3 satır alma; tabloda görünen tüm işlem satırlarını çıkar.
      - Şunları transaction yapma: önceki hesap özeti bakiyesi, toplam, mesaj, müşteri limiti, asgari ödeme, ayılık taksitli borç toplamı, kalan taksitli borç toplamı.
      - Negatif tutarlar ödeme/iade sayılır ve type "income" olmalıdır.
      - Pozitif harcama tutarları type "expense" olmalıdır.
      - Tarih formatını YYYY-MM-DD yap.
      - Kategorileri açıklamaya göre tahmin et.
      `,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    return Response.json({
      result: response.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "OCR işlemi başarısız" },
      { status: 500 }
    );
  }
}
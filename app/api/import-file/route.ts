import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        {
          error:
            "Şimdilik sadece PNG, JPG/JPEG veya WEBP görsel yükle. PDF için ekran görüntüsü alıp yükle.",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type === "image/jpg" ? "image/jpeg" : file.type;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
Sen Türkçe banka ve kredi kartı ekstresi okuyan bir muhasebe veri çıkarma asistanısın.
Görevin görseldeki işlem tablosundan gerçek finans hareketlerini satır satır çıkarmaktır.
Sadece geçerli JSON döndür. Açıklama yazma.
`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
Bu görseli analiz et ve sadece şu JSON formatında döndür:

{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "type": "income veya expense",
      "category": "Market | Restoran/Kafe | Yakıt | Seyahat | Dijital abonelik | Giyim | Kira | Fatura | Çocuk | Araç | Sağlık | Borç ödemesi | Yatırım | Maaş | Satış | Diğer",
      "account": "Türkiye hesabı",
      "amount": 123.45,
      "currency": "TRY",
      "description": "işlem açıklaması",
      "raw": "görseldeki ham satır"
    }
  ]
}

Çok önemli kurallar:
- Bu belge bir Türk bankası kredi kartı hesap özeti olabilir.
- İşlem tablosunda TUTAR sütunu TL ise currency her zaman "TRY" olmalı.
- Açıklamada EUR, USD, DUBLIN, FRANKFURT, APPLE.COM yazması currency değerini değiştirmez.
- "23 EUR SATIŞ" veya "29,99 EUR SATIŞ" açıklamadır; ana işlem tutarı TUTAR sütunundaki TL değeridir.
- İşlem tablosundaki HER gerçek hareketi ayrı transaction yap.
- Sadece birkaç satır alma; tabloda görünen tüm işlem satırlarını çıkar.
- Şunları transaction yapma:
  önceki hesap özeti bakiyesi,
  toplam,
  mesaj,
  müşteri limiti,
  kullanılabilir limit,
  asgari ödeme,
  hesap özeti borcu,
  aylık taksitli borç toplamı,
  kalan taksitli borç toplamı,
  faiz oranları,
  barkod,
  kart numarası,
  müşteri numarası.
- "ÖDENEN OTOMATİK TAHSİLAT", "DÜZENLİ FON ALIM TALİMATI" gibi negatif tutarlı satırlar para çıkışı/ödeme/iade olabilir; type "income" değil, kategori "Borç ödemesi" veya "Yatırım" olmalı.
- Kredi kartı ekstresinde pozitif tutarlar genelde harcamadır ve type "expense" olmalı.
- Negatif tutarlar kredi kartı borcunu azaltan ödeme/iade gibi düşünülmeli; type "expense" ve kategori "Borç ödemesi" veya "Yatırım" seç.
- Tarih formatını YYYY-MM-DD yap.
- Türkçe ondalık formatı kullanılıyorsa 1.253,02 değerini 1253.02 yap.
- Açıklamaya göre kategori tahmin et:
  MIGROS, MARKET, BİM, A101 -> Market
  CAFE, KAHVE, RESTAURANT, YEMEK -> Restoran/Kafe
  PETROL, SHELL, OPET, Q8, BENZIN -> Yakıt
  SUNEXPRESS, OTEL, BOOKING, AIRLINES -> Seyahat
  APPLE.COM, CHATGPT, OPENAI, GOOGLE, NETFLIX -> Dijital abonelik
  TESETTÜR, GİYİM, ZARA, LCW -> Giyim
  DÜZENLİ FON, ALTIN ALIŞ, FON -> Yatırım
  OTOMATİK TAHSİLAT, KREDİ KARTI ÖDEME -> Borç ödemesi
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
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return Response.json({ error: "Metin yok" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Sen kişisel muhasebe asistanısın. Kullanıcının serbest yazdığı metinden finans hareketlerini çıkar. Sadece JSON döndür.",
        },
        {
          role: "user",
          content: `
Metni analiz et ve şu formatta JSON döndür:

{
  "transactions": [
    {
      "date": "YYYY-MM-DD veya boş string",
      "type": "income veya expense",
      "category": "Market | Yakıt | Kira | Fatura | Çocuk | Araç | Sağlık | Borç ödemesi | Yatırım | Maaş | Satış | Diğer",
      "account": "KBC | Türkiye hesabı | Dolar hesabı | Nakit | Diğer",
      "amount": 123.45,
      "currency": "EUR | USD | TRY",
      "description": "kısa açıklama",
      "raw": "metindeki ilgili ifade"
    }
  ]
}

Kurallar:
- Euro, eur, € -> EUR
- TL, TRY, ₺ -> TRY
- Dolar, USD, $ -> USD
- Lidl, Aldi, Carrefour, Migros, market -> Market
- Q8, Shell, Total, benzin, petrol -> Yakıt
- salaris, maaş, loon -> Maaş ve income
- ödeme, kredi kartı ödeme, tahsilat -> Borç ödemesi
- Harcama ise expense, gelir ise income
- Tarih belirtilmemişse date boş string bırak
- Tutarı sayı olarak yaz
- Açıklamayı sadeleştir

Metin:
${text}
`,
        },
      ],
    });

    return Response.json({
      result: response.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Metin analiz edilemedi" },
      { status: 500 }
    );
  }
}
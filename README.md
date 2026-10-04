# Rodinya Media API

NestJS 11, MongoDB/Mongoose, JWT ve yerel JPEG depolaması kullanan REST API.

## Çalıştırma

```bash
pnpm install
cp .env.example .env
# .env içindeki MongoDB URI ve iki ayrı JWT secret değerini düzenleyin.
pnpm start:dev
```

JWT secret'ları birbirinden farklı ve en az 32 karakter olmalıdır. Access token 7 gün,
refresh token 30 gün geçerlidir. Uygulama MongoDB bağlantısı kurulmadan başlamaz.
`MAX_FILE_SIZE` 1–5242880 bayt aralığında olmalıdır; varsayılan 5 MiB'dir.

- API: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`

## Endpoint'ler

| Metot | Yol | Erişim |
|---|---|---|
| POST | `/api/auth/register` | Public; `{ "email": "user@example.com", "password": "Passw0rd!" }` |
| POST | `/api/auth/login` | Public; aynı gövde |
| POST | `/api/auth/refresh` | Public; `{ "refreshToken": "..." }` |
| GET | `/api/users/me` | Access token |
| POST | `/api/media/upload` | Access token; multipart `file` alanı |
| GET | `/api/media/my?page=1&limit=20` | Kullanıcının kendi dosyaları; sayfalı sonuç |
| GET | `/api/media/:id` | Sahip veya izinli kullanıcı |
| GET | `/api/media/:id/download` | Sahip veya izinli kullanıcı; JPEG stream |
| DELETE | `/api/media/:id` | Yalnızca sahip |
| GET | `/api/media/:id/permissions` | Yalnızca sahip |
| POST | `/api/media/:id/permissions` | Yalnızca sahip; `{ "userId": "...", "action": "add" }` veya `remove` |
| GET | `/api/health` | Public; MongoDB ping başarılıysa 200, değilse 503 |

Korunan uçlarda `Authorization: Bearer <accessToken>` başlığı gerekir. Admin rolü dosya
sahipliği kontrolünü atlamaz. Olmayan hedef kullanıcıya izin eklenmez.

## Kimlik doğrulama ve istek bağlamı

Global JWT guard, token imzasını, süresini, türünü, issuer ve audience değerlerini doğrular.
Kullanıcıyı repository üzerinden yükleyip `{ id, email, role, createdAt, updatedAt }`
nesnesini AsyncLocalStorage'a yazar. İstemciden gelen kullanıcı ID'si kimlik olarak kabul edilmez.
Şifreler salt ile scrypt kullanılarak hash'lenir; şifre/hash/token ALS kullanıcı nesnesinde bulunmaz.

Refresh token'ın yalnızca SHA-256 hash'i saklanır. Her refresh işleminde token değiştirilir;
eski token tekrar kullanılamaz. Güncelleme MongoDB'de mevcut hash koşuluyla atomik yapılır.
Kullanıcı başına son girişin refresh token'ı geçerlidir; yeni giriş önceki refresh token'ını
geçersiz kılar. Önceden verilmiş access token'lar 7 günlük süreleri dolana kadar geçerlidir.

## Standart response

Başarılı JSON yanıtı:

```json
{ "success": true, "statusCode": 200, "data": {} }
```

Hata yanıtı:

```json
{
  "success": false,
  "statusCode": 401,
  "error": { "code": "AuthenticationError", "message": "Kimlik doğrulaması gereklidir." }
}
```

DTO doğrulama hatalarında `error.message` string dizisi olabilir. Beklenmeyen sunucu
hatalarının ayrıntıları istemciye aktarılmaz. Dosya indirme JSON zarfına alınmaz; JPEG stream döner.

## Medya

Dosyalar `UPLOAD_DIR` altında rastgele `.jpg` adlarıyla saklanır; statik klasör yayını yoktur.
MIME türü ve JPEG içeriği doğrulanır. Çözümleme için 64 MiB bellek sınırı uygulanır.
Dosya boyutu multipart işlenirken sınırlandırılır. Veritabanına kayıt başarısız olursa
yeni dosya temizlenir. Fiziksel dosya yolu API response'larına dahil edilmez.

JPEG doğrulaması senkron çalışır ve yoğun yükleme sırasında diğer isteklerin yanıtlarını
geciktirebilir. Yüksek yükte, sınırlı sayıda worker thread kullanan bir worker pool ile
doğrulama ana iş parçacığından taşınarak yanıt süreleri iyileştirilebilir. Worker sayısı
ve kuyruk kapasitesi CPU/bellek kaynaklarına göre sınırlandırılmalı; performans kazancı
yük testiyle doğrulanmalıdır.

Şu anda rate limit uygulanmıyor. Login gibi kimlik doğrulama uçlarında yoğun denemeleri,
upload uçlarında ise kaynak tüketimini azaltmak için IP veya doğrulanmış kullanıcı bazlı
istek sınırları eklenebilir. Limitler endpoint'in kullanımına göre belirlenmeli;
sınır aşıldığında `429 Too Many Requests` yanıtı verilmelidir. Rate limit, aynı anda
işlenen yükleme sayısını sınırlamanın yerini tutmaz.

## Mimari

- `common/database`: bağlantı yönetimi.
- `modules/*/schemas` ve model provider'ları: ilgili modülün model kayıtları.
- Repository/storage port'ları: use-case'leri Mongoose ve dosya sistemi detaylarından ayırır.
- `MediaAccessService`: medya varlığı, görüntüleme ve sahiplik kontrollerini paylaşır. `requireReadable` aktif medyayı sahip/izinli kullanıcıya, `requireOwner` yalnızca sahibine açar. `requireDeletable` silinmeyi bekleyen kayıtlar dahil silme erişimini yalnızca sahibine verir.
- `common/als`: istek ve doğrulanmış kullanıcı bağlamı.
- `common/custom-errors`, interceptor ve filtre: ortak hata/response yapısı.
- `modules/auth`: JWT, şifre doğrulama ve refresh akışı.

## Kontroller

```bash
pnpm build
pnpm test -- --runInBand
pnpm test:e2e -- --runInBand
pnpm exec eslint src test --no-fix
```

HTTP entegrasyon testleri gerçek Nest uygulamasını, JWT guard'ını, ALS'yi, DTO doğrulamasını,
JPEG çözümlemesini ve geçici dosya sistemini kullanır. Repository'ler bellek içi test
uygulamalarıyla değiştirilir; testler Atlas'a bağlanmaz ve `.env` sırlarını kullanmaz.
Canlı Atlas bağlantısı ve gerçek MongoDB sorguları bu testlerin kapsamı dışındadır.

## Pagination ve sorgular

`GET /api/media/my?page=1&limit=20` varsayılan olarak 20 kayıt döndürür. `limit` 1–100,
`page` 1–10000 arasında tam sayı olmalıdır. Kayıtlar `createdAt` ve eşit tarihlerde `_id`
alanına göre azalan sıradadır. Yanıtın `data` alanı artık doğrudan dizi değildir:

```json
{
  "success": true,
  "statusCode": 200,
  "data": { "items": [], "total": 0, "page": 1, "limit": 20, "totalPages": 0 }
}
```

Liste ve sayım aynı kullanıcı/aktif kayıt filtresini kullanır. İki sorgu paralel çalışır;
eşzamanlı ekleme/silmede toplam ve liste tek bir veritabanı snapshot'ını temsil etmez.
Çok büyük veri kümelerinde derin sayfalar için cursor pagination değerlendirilebilir.

Sorgu için `{ ownerId: 1, deletingAt: 1, createdAt: -1, _id: -1 }` indeksi tanımlıdır.
Mongoose otomatik indeks oluşturma açıksa yeni indeksi oluşturur. Önceden oluşturulmuş
indeksler bu değişiklikle otomatik silinmez; canlı veritabanında indeks silme yapılmadı.

Medya erişim kontrolü use-case içindeki `MediaAccessService` üzerinden yapılır.
Ayrı bir medya guard'ı bulunmaz; detay/indirme akışında medya bir kez okunur.
Repository varsayılan singleton scope kullanır; kullanıcıya veya isteğe özel veri
ve sorgu önbelleği tutmaz. Her okuma veritabanındaki güncel veriyi sorgular.

## Silme işlemini tekrar deneme

DELETE önce `deletingAt` alanını DB'ye yazar, sonra dosyayı ve son olarak DB kaydını siler.
Bu alan doluysa medya listelenmez, görüntülenmez, indirilemez ve izinleri değiştirilemez.
Eski kayıtlarda alanın bulunmaması aktif kayıt olarak değerlendirilir; toplu veri dönüşümü gerekmez.

Bir adım başarısız olursa medya sahibi aynı `DELETE /api/media/:id` isteğini tekrar gönderebilir.
Dosyanın önceden silinmiş olması engel değildir; diğer disk hataları normal hata olarak döner.
Tamamen silinmiş bir kayda sonraki DELETE isteği 404 döndürür. Otomatik arka plan temizleyicisi
bulunmaz; yeniden deneme istemci tarafından yapılır. Başlamış bir indirme akışı geriye dönük iptal edilmez.

## Hata logları

Global filtre hataları `requestId`, HTTP metodu, query içermeyen yol, status ve özgün
hata adı/mesajı/stack'i ile sunucuda loglar. 5xx hataları error, 4xx hataları warn seviyesindedir.
İstek body/header'ları loglanmaz. İstemci cevabındaki `X-Request-Id` header'ı logla eşleştirilir;
özgün sunucu hatası standart 5xx yanıtında gösterilmez.

## Girdi doğrulaması

Medya yollarındaki `id`, `MediaIdParamsDto` ile MongoDB ObjectId formatında doğrulanır.
Giriş yapılmış bir istekte geçersiz ID 400; geçerli formatta olup bulunamayan medya 404 döndürür.
Global JWT guard kimliği doğrular; ardından controller DTO'ları ValidationPipe üzerinden
doğrulanır. Geçersiz medya ID'si use-case'e ulaşmaz ve medya sorgusu yapılmaz.
İzin isteğinin `userId` ve `action` alanları `ManagePermissionDto`, listeleme parametreleri
`MediaPageQueryDto` tarafından doğrulanır. Kullanıcı kimliği JWT guard ve ALS'den gelir.
Use-case'ler doğrulanmış girdilerle çalışır; medya varlığı, sahiplik ve erişim gibi iş kurallarını
korur. Gelecekte HTTP dışı bir çağrı yolu eklenirse girdi doğrulaması o girişte de yapılmalıdır.

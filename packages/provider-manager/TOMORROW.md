# Yarın İçin Plan (Phase 3: Integration)

## Bugün Tamamlananlar ✅
- Provider Manager paketi (packages/provider-manager/)
- 4 adapter: OpenAI (text+embedding), Anthropic, Serper
- 35 gerçek API testi (%85 başarı)
- Discovery pattern implementasyonu
- Cost tracking sistemi

## Yarın Yapılacaklar 🔄

### 1. Research Modülü Entegrasyonu
**Dosya**: `apps/backend/src/modules/research/research.service.ts`

**Değişiklikler**:
- [ ] ProviderManager import et
- [ ] Hardcoded OpenAI calls → ProviderManager.generate()
- [ ] Hardcoded search calls → ProviderManager.searchMultiple()
- [ ] UseCase.QUERY_ENHANCEMENT kullan
- [ ] UseCase.WEB_SEARCH + discovery pattern

**Örnek**:
```typescript
// Önce:
const response = await openai.chat.completions.create(...)

// Sonra:
const response = await providerManager.generate(
  prompt,
  UseCase.QUERY_ENHANCEMENT
)
```

### 2. Search Modülü Entegrasyonu
**Dosya**: `apps/backend/src/modules/search/search.service.ts`

**Değişiklikler**:
- [ ] searchArtOpportunities() → ProviderManager.searchMultiple()
- [ ] Discovery pattern (Serper + Google paralel)
- [ ] Fallback logic'i kaldır (ProviderManager halleder)

### 3. Orchestrator Modülü
**Dosya**: `apps/backend/src/modules/orchestrator/orchestrator.service.ts`

**Değişiklikler**:
- [ ] ProviderManager inject et
- [ ] LLM çağrıları → ProviderManager.generate()
- [ ] Cost tracking aktif et

### 4. Config & Environment
**Dosyalar**:
- `apps/backend/src/config/`
- `apps/backend/.env`

**Yapılacaklar**:
- [ ] ProviderManager'ı NestJS module olarak ekle
- [ ] Environment variables kontrol et
- [ ] Singleton instance oluştur

## Test Stratejisi
1. Her modül entegrasyonundan sonra test et
2. Backend'i başlat: `pnpm dev`
3. API endpoint'leri test et
4. Cost tracking logları kontrol et

## Notlar
- Provider Manager: `packages/provider-manager/`
- Dokümantasyon: `packages/provider-manager/README.md`
- Test planı: `packages/provider-manager/TEST_PLAN.md`
- Bugünün commitleri: 4f2ecc0...0f4ee0a (5 commit)

## Beklenen Süre
- Research modülü: ~1 saat
- Search modülü: ~45 dakika
- Orchestrator modülü: ~1 saat
- Test & debug: ~30 dakika
**Toplam**: ~3-4 saat

## Başlamadan Önce
1. ✅ Güvenlik sorunu çözüldü mü? (repo private, API keyler değişti mi?)
2. ✅ Push yetkisi var mı?
3. ✅ Backend çalışıyor mu? (`pnpm dev`)

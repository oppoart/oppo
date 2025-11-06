# todo

`275b6593145ba7a36c3d10cb5d9e50b9415079b0`

## high priority

### Query Types Refactor (Dynamic Parameters)

**Amaç**: Query Templates'i statik checkbox listesinden **parametrik query generator'a** dönüştürmek.

**Backend Changes:**
- [ ] Prisma Schema:
  - [ ] `QueryTemplateGroup.description` field'ini kaldır (nullable olduğu için migration kolay)
  - [ ] `ArtistProfile` modeline yeni fields ekle:
    ```prisma
    locations        String[]  @default([])  // ["New York", "Europe", "Los Angeles"]
    opportunityTypes String[]  @default([])  // ["grant", "residency", "exhibition", "award"]
    amountRanges     String[]  @default([])  // ["$1k-5k", "$5k-10k", "$10k+", "any"]
    themes           String[]  @default([])  // ["sustainability", "identity", "technology"]
    ```
  - [ ] Migration oluştur ve çalıştır

**Frontend Changes:**
- [ ] Query Types UI Redesign:
  - [ ] Group description görünümünü kaldır (management'tan da)
  - [ ] Profile edit > Query Types tab'ı yeniden tasarla:
    - [ ] Üstte: "Query Parameters" section
      - [ ] Location tags input (Skills gibi ekle/çıkar)
      - [ ] Opportunity Types tags input
      - [ ] Amount Ranges tags input
      - [ ] Themes & Subjects tags input
    - [ ] Altta: "Query Templates" (3 sütunlu liste, checkboxlar kalksın)
      - [ ] Template text
      - [ ] Placeholder'lar highlight edilmiş göster
      - [ ] Example preview (parameters ile doldurulmuş)
  - [ ] Query Template Manager modal'ı güncelle (description field kaldır)

**Query Generation Logic:**
- [ ] Backend'de query expansion implementasyonu:
  - [ ] Template'deki placeholder'ları tespit et
  - [ ] Profile parameters ile cartesian product oluştur
  - [ ] Örn: `[opportunity-type] in [location]` + 2 types × 3 locations = 6 query

**Benefits:**
- ✓ Profile data zenginleşir (structured + semantic)
- ✓ Query'ler profile-specific ve targeted olur
- ✓ Aynı template farklı profiller için farklı query'ler üretir
- ✓ Geographic, opportunity type, budget preferences capture edilir
- ✓ Semantic matching için daha fazla context

---

### Profile Analysis Feature

**Amaç**: Profile view sayfasındaki "Analyze Profile" butonuna basınca, profile quality ve semantic matching için öneriler göstermek.

**Frontend:**
- [ ] Profile view page'de analyze sonuçları için UI
  - [ ] Profile Completeness Score (0-100%)
  - [ ] Semantic Strength Indicator
  - [ ] Missing/Weak Areas:
    - [ ] Artist Statement quality (min 200 char)
    - [ ] Bio quality (min 100 char)
    - [ ] Skills count (min 3)
    - [ ] Interests count (min 3)
    - [ ] Query parameters completeness
  - [ ] Suggestions:
    - [ ] "Add more details to artist statement"
    - [ ] "Add location preferences for better targeting"
    - [ ] "Select opportunity types you're interested in"
  - [ ] Real examples:
    - [ ] "Profiles with statements over 500 chars get 40% more matches"
    - [ ] "Adding 3+ themes improves relevance by 35%"

**Backend:**
- [ ] Analyst API için profile quality scoring endpoint
  - [ ] Completeness calculation
  - [ ] Text quality metrics (length, vocabulary richness)
  - [ ] Structured data coverage
  - [ ] Return actionable recommendations

**Learning Benefit:**
- ✓ Kullanıcı profile'ın nasıl değerlendirildiğini görür
- ✓ AI matching mekanizmasını anlar
- ✓ Ne yazarsa daha iyi match alacağını öğrenir
- ✓ Profile'ını iterative olarak iyileştirir


## medium priority

- [ ] Profile edit validation improvements:
  - [ ] Artist Statement: required, min 200 chars
  - [ ] Bio: required, min 100 chars
  - [ ] Skills: min 3 required
  - [ ] Interests: min 3 required
  - [ ] Show real-time completeness indicator

## completed

- [x] Query Types: Profile-level query template selections
- [x] Profile delete modal: AlertDialog with confirmation
- [x] Profile save: Loading states, toast notifications

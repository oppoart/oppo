# Profile Quality Analysis Algorithm

## Overview

The Profile Quality Analysis system provides intelligent evaluation of artist profiles through a comprehensive scoring mechanism. It assesses profile completeness across multiple dimensions and generates actionable recommendations to help artists optimize their profiles for better opportunity matching.

## Core Algorithm

### Scoring Model

The system employs a **weighted scoring algorithm** that evaluates profiles on a 0-100 scale, where each component contributes based on its importance to the overall profile quality and opportunity matching effectiveness.

#### Weight Distribution

| Component | Weight | Minimum Threshold | Rationale |
|-----------|--------|-------------------|-----------|
| Artist Statement | 25% | 200 characters | Core identity and artistic vision; primary matching signal |
| Query Parameters | 20% | 8 total params | Enables targeted opportunity discovery |
| Biography | 15% | 100 characters | Professional background and context |
| Skills | 15% | 3 items | Technical capabilities for opportunity matching |
| Interests | 15% | 3 items | Thematic focus areas for semantic matching |
| Mediums | 10% | Non-default | Basic artistic categorization |

### Calculation Method

```typescript
function calculateScore(profile: ArtistProfile): number {
  let score = 0;

  // Biography (15 points)
  if (bioLength >= 100) {
    score += 15;
  } else if (bioLength > 0) {
    score += floor((bioLength / 100) * 15);
  }

  // Artist Statement (25 points)
  if (statementLength >= 200) {
    score += 25;
  } else if (statementLength > 0) {
    score += floor((statementLength / 200) * 25);
  }

  // Skills (15 points)
  if (skillsCount >= 3) {
    score += 15;
  } else if (skillsCount > 0) {
    score += floor((skillsCount / 3) * 15);
  }

  // Interests (15 points)
  if (interestsCount >= 3) {
    score += 15;
  } else if (interestsCount > 0) {
    score += floor((interestsCount / 3) * 15);
  }

  // Mediums (10 points)
  if (hasMediums && !includesDefault) {
    score += 10;
  }

  // Query Parameters (20 points)
  const totalParams = locations + opportunityTypes + amountRanges + themes;
  if (totalParams >= 8) {
    score += 20;
  } else if (totalParams > 0) {
    score += floor((totalParams / 8) * 20);
  }

  return min(100, score);
}
```

## Components Analysis

### 1. Biography Evaluation

**Purpose**: Assess professional background communication

**Metrics**:
- Character count
- Threshold: 100 characters minimum

**Scoring Logic**:
- Full points (15): ≥ 100 characters
- Partial credit: Proportional to threshold ratio
- Zero points: Empty bio

**Quality Indicators**:
- ✅ Comprehensive: Complete professional narrative
- ⚠️ Needs detail: Present but under threshold
- ❌ Missing: No biography provided

### 2. Artist Statement Assessment

**Purpose**: Evaluate core artistic identity and vision

**Metrics**:
- Character count
- Threshold: 200 characters minimum

**Scoring Logic**:
- Full points (25): ≥ 200 characters
- Partial credit: Proportional to threshold ratio
- Zero points: Empty statement

**Rationale**: Artist statement receives the highest weight (25%) because it serves as the primary semantic matching signal for opportunity relevance scoring.

**Quality Indicators**:
- ✅ Well-articulated: Comprehensive artistic vision
- ⚠️ Needs depth: Present but superficial
- ❌ Missing: No statement provided

### 3. Skills Analysis

**Purpose**: Identify technical capabilities

**Metrics**:
- Skill count
- Threshold: 3 skills minimum

**Scoring Logic**:
- Full points (15): ≥ 3 skills
- Partial credit: Proportional to threshold ratio
- Zero points: No skills listed

**Quality Indicators**:
- ✅ Documented: Sufficient skill diversity (3+)
- ⚠️ Limited: 1-2 skills (insufficient for matching)
- ❌ Missing: No skills specified

### 4. Interests Evaluation

**Purpose**: Map thematic focus areas

**Metrics**:
- Interest count
- Threshold: 3 interests minimum

**Scoring Logic**:
- Full points (15): ≥ 3 interests
- Partial credit: Proportional to threshold ratio
- Zero points: No interests listed

**Rationale**: Interests improve semantic matching by providing thematic context beyond technical skills.

**Quality Indicators**:
- ✅ Defined: Multiple focus areas identified (3+)
- ⚠️ Limited: Narrow focus (1-2 interests)
- ❌ Missing: No interests specified

### 5. Mediums Assessment

**Purpose**: Basic artistic categorization

**Metrics**:
- Medium selection status
- Non-default requirement

**Scoring Logic**:
- Full points (10): Specific mediums selected
- Zero points: Default "other" only

**Quality Indicators**:
- ✅ Specified: Clear medium categories
- ❌ Unspecified: Default selection only

### 6. Query Parameters Evaluation

**Purpose**: Search optimization capability assessment

**Metrics**:
- Total parameter count across four categories:
  - Locations
  - Opportunity types
  - Amount ranges
  - Themes
- Threshold: 8 total parameters

**Scoring Logic**:
- Full points (20): ≥ 8 parameters
- Partial credit: Proportional to threshold ratio
- Zero points: No parameters configured

**Rationale**: Query parameters enable targeted opportunity discovery. Their absence limits system effectiveness regardless of profile quality.

**Quality Indicators**:
- ✅ Well-configured: Comprehensive parameters (8+)
- ⚠️ Partial: Some parameters (1-7)
- ❌ Not configured: No search parameters

## Recommendation Engine

### Priority Classification

The system generates three priority levels based on impact and urgency:

#### High Priority
- **Trigger**: Critical missing components
- **Examples**:
  - No biography
  - No artist statement
  - Zero skills or interests
- **Impact**: Severely limits matching effectiveness

#### Medium Priority
- **Trigger**: Below-threshold content
- **Examples**:
  - Biography < 100 characters
  - Statement < 200 characters
  - Skills/Interests < 3
  - Default mediums only
- **Impact**: Reduces matching accuracy

#### Low Priority
- **Trigger**: Optional enhancements
- **Examples**:
  - Additional query parameters
  - Extended descriptions
- **Impact**: Incremental improvements

### Recommendation Structure

Each recommendation includes:

```typescript
interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  area: string;           // Component name
  message: string;        // Why it matters
  action: string;         // Specific next step
}
```

Example output:
```json
{
  "priority": "high",
  "area": "Artist Statement",
  "message": "Your artist statement is the core of profile matching",
  "action": "Write an artist statement (minimum 200 characters recommended)"
}
```

### Recommendation Sorting

Recommendations are automatically sorted by:
1. Priority level (high → medium → low)
2. Alphabetically within same priority

## Strengths & Weaknesses Detection

### Strengths Identification

Strengths are recognized when components exceed their thresholds:

- "Comprehensive biography" (bio ≥ 100 chars)
- "Well-articulated artist statement" (statement ≥ 200 chars)
- "N skills documented" (skills ≥ 3)
- "N interest areas defined" (interests ≥ 3)
- "Art mediums clearly specified" (non-default mediums)
- "Query parameters well-configured" (params ≥ 8)

### Weaknesses Detection

Weaknesses are identified for:

- Missing components (zero content/selection)
- Below-threshold content (present but insufficient)
- Default-only selections (mediums)

## Output Schema

```typescript
interface ProfileQualityAnalysis {
  profileId: string;
  completenessScore: number;        // 0-100
  strengths: string[];              // Achieved criteria
  weaknesses: string[];             // Missing/insufficient areas
  recommendations: Recommendation[]; // Sorted by priority
  metrics: {
    bioLength: number;
    statementLength: number;
    skillsCount: number;
    interestsCount: number;
    queryParamsCount: number;
  };
  analyzedAt: string;               // ISO 8601 timestamp
}
```

## Integration Points

### Backend Service
- **Location**: `apps/backend/src/modules/analyst/analyst.service.ts`
- **Method**: `analyzeProfileQuality(profileId: string)`
- **Returns**: `ProfileQualityAnalysis`

### API Endpoint
- **Route**: `POST /analyst/analyze`
- **Auth**: Required (AuthGuard)
- **Payload**: `{ artistProfileId: string }`
- **Response**: `{ success: boolean, data: ProfileQualityAnalysis }`

### Frontend Integration
- **Component**: `ProfileQualityAnalysisDisplay`
- **Location**: Profile view page, "Analysis Results" tab
- **Trigger**: "Analyze Profile" button in header

## Performance Considerations

### Computation Complexity
- **Time**: O(1) - Direct field access and simple arithmetic
- **Space**: O(1) - Fixed-size result structure
- **Database**: Single profile fetch query

### Caching Strategy
Analysis results are not cached by design because:
1. Profile updates should immediately reflect in analysis
2. Computation is lightweight (< 1ms)
3. User expects real-time feedback

### Scalability
- Stateless operation
- No external API calls
- Minimal database load
- Suitable for high-frequency analysis requests

## Future Enhancements

### Planned Improvements

1. **Semantic Analysis**
   - NLP quality assessment for bio/statement
   - Vocabulary richness scoring
   - Readability metrics

2. **Comparative Scoring**
   - Percentile ranking against other profiles
   - Category-specific benchmarks
   - Historical trend analysis

3. **Machine Learning Integration**
   - Profile quality prediction
   - Success correlation analysis
   - Personalized threshold recommendations

4. **Advanced Recommendations**
   - Example-based guidance
   - Template suggestions
   - Auto-completion hints

### Extensibility Points

The algorithm is designed for easy extension:

```typescript
// Add new component evaluation
interface ComponentEvaluator {
  weight: number;
  evaluate: (profile: ArtistProfile) => number;
  generateRecommendations: (profile: ArtistProfile) => Recommendation[];
}

// Register new evaluators
const evaluators: ComponentEvaluator[] = [
  bioEvaluator,
  statementEvaluator,
  skillsEvaluator,
  // Add new evaluators here
];
```

## References

- **Profile Purpose Documentation**: `.backups/tr/profile-amaci.md`
- **Artist Profile Schema**: `apps/backend/prisma/schema.prisma`
- **Frontend Types**: `apps/web/src/types/analyst.ts`
- **Analysis Component**: `apps/web/src/components/dashboard/profile-quality-analysis.tsx`

## Version History

- **v1.0.0** (2025-01-11): Initial implementation with 6-component weighted scoring

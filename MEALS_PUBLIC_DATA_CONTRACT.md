# Meals Public Data Contract

**Document Version:** 1.0.0  
**Status:** Definitive Source Specification  
**Scope:** Public Data Model for Future Meals Website  

---

## 1. Included Source Worksheets

The public application consumes **14 authoritative relational worksheets** from the published Google Sheets workbook.

Base CSV export URL pattern:  
`https://docs.google.com/spreadsheets/d/e/2PACX-1vS5zY2-4h1TBiHM1bgJ4NiFiBgngiFNAozE-NWNStZOmSW8BT7UuYBBut9WhpJeKutRaUk3DkDZFNlH/pub?output=csv&gid={gid}`

| Worksheet Name | GID | Likely Primary Key | Purpose / Relevant Fields |
| :--- | :--- | :--- | :--- |
| **`Meals`** | `489348868` | `Meal_ID` | Master meal visit log: `Meal_ID`, `Rest_ID`, `Date_Visited`, `Year`, `Meal_Rating`, `Meal_Value`, `Comment`, `Sentiment`, `Sentiment_High`, `AFC_Game`, `AFC_Opponent`, `AFC_Score`, `AFC_Op_Score`, `AFC_Comment`, `Business`. |
| **`Rest`** | `0` | `Rest_ID` | Venue/restaurant catalog: `Rest_ID`, `Rest_Name`, `Rest_Address`, `City_ID`, `Type_ID`, `Rest X Cords`, `Rest Y Cords`, `GMap2`, `GName2`, `GType2`, `GAddress2`, `GURL2`, `GRating2`. |
| **`City`** | `763089517` | `City_ID` | Authoritative city reference table: `City_ID`, `City_Text`, `Country_ID`. |
| **`Country`** | `172877059` | `Country_ID` | Authoritative country reference table: `Country_ID`, `Country_Text`, `CountryLong`, `CountryLang`, `ISOCode`. |
| **`Type`** | `61815367` | `Type_ID` | Restaurant cuisine/establishment classification: `Type_ID`, `Type`. |
| **`Meals_Main`** | `786291206` | `Meals_Main_ID` | Main dish occurrences: `Meals_Main_ID`, `Meal_ID`, `Food_ID`, `Main_Rating`, `Comment`. |
| **`Meals_Starter`** | `1297629851` | `Meals_Starter_ID` | Starter dish occurrences: `Meals_Starter_ID`, `Food_ID`, `Meal_ID`, `Starter_Rating`. |
| **`Food`** | `377846928` | `Food_ID` | Master food/dish catalog: `Food_ID`, `Food_Text`, `Ingredient_ID`, `Food_Type_ID`, `Food_Category`. |
| **`Ingredient`** | `1459651357` | `Ingredient_ID` | Primary food ingredient catalog: `Ingredient_ID`, `Food_Ingredient`, `Ingredient_Category`. |
| **`FoodType`** | `1922827128` | `Food_Type_ID` | Dish type taxonomy lookup: `Food_Type_ID`, `FoodType`. |
| **`FoodCat`** | `249100290` | `FoodCat` (string) | High-level food category classification: `FoodCat`. |
| **`Meals_Photo`** | `153241932` | `Photo_ID` | Media attachments for meals: `Photo_ID`, `Meal_ID`, `PhotoName`, `Photo`, `Photo_Comment`. |
| **`Meals_People`** | `668079142` | `(Meal_ID, People_ID)` | Junction table connecting meals with attendees: `Meals_People_ID`, `Meal_ID`, `People_ID`. |
| **`People_Public`** | `2108210132` | `People_ID` | Privacy-sanitized dining companion view: `People_ID`, `Public_Name`, `Public?`, `Count_Meals`. |

---

## 2. Excluded Worksheets

The following 5 worksheets exist in the workbook but are **strictly excluded** from ingestion by the public application:

1. **`Sheet30` (GID: `390641780`):**
   * *Reason for exclusion:* Staging log / working sheet used for batch recording meals during a specific South American travel trip. Not part of the normalized production schema.
2. **`Sheet31` (GID: `1759388831`):**
   * *Reason for exclusion:* A denormalized spreadsheet export/flattened shortcut combining meals, restaurants, cities, and dishes. The public application must follow the *Primary Source Principle*, consuming authoritative normalized tables directly.
3. **`Pivot Table 2` (GID: `92685618`):**
   * *Reason for exclusion:* Google Sheets visual cross-tabulation of `Meal_Rating` vs `Sentiment_High`. Derived spreadsheet calculation, not a relational entity.
4. **`AI Prompts` (GID: `1941609441`):**
   * *Reason for exclusion:* Prompt template notes used by the workbook author to query LLMs for ingredient extraction. Contains no relational operational data.
5. **`People` (GID: `620287530`):**
   * *Reason for exclusion:* Master table containing raw, unredacted personal names. Excluded by policy to safeguard personal privacy; the application must consume only `People_Public`.

---

## 3. Relationship Model

The conceptual and referential architecture is defined below:

```text
Meal (Meals)
 ├── N:1 ──► Restaurant (Rest)
 │            ├── N:1 ──► Restaurant Type (Type)
 │            └── N:1 ──► City (City)
 │                         └── N:1 ──► Country (Country)
 │
 ├── 1:N ──► Main Dishes[] (Meals_Main)
 │            └── N:1 ──► Food (Food)
 │                         ├── N:1 ──► Ingredient (Ingredient)
 │                         │            └── N:1 ──► Food Category (FoodCat)
 │                         ├── N:1 ──► Food Type (FoodType)
 │                         └── N:1 ──► Food Category (FoodCat)
 │
 ├── 1:N ──► Starters[] (Meals_Starter)
 │            └── N:1 ──► Food (Food)
 │
 ├── 1:N ──► Photos[] (Meals_Photo)
 │
 └── 1:N ──► Companions[] (Meals_People)
              └── N:1 ──► Companion (People_Public)
```

### Complete Foreign Key Specification

| Source Table | Source Field | Target Table | Target Field | Cardinality | Enforceability / Integrity Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Meals` | `Rest_ID` | `Rest` | `Rest_ID` | N:1 | 100% valid except 2 orphan IDs: `2655`, `2661` |
| `Rest` | `City_ID` | `City` | `City_ID` | N:1 | **100% valid** (all 723 populated IDs match `City`) |
| `Rest` | `Type_ID` | `Type` | `Type_ID` | N:1 | **100% valid** (all IDs match `Type`) |
| `City` | `Country_ID` | `Country` | `Country_ID` | N:1 | **100% valid** (all 55 IDs match `Country`) |
| `Meals_Main` | `Meal_ID` | `Meals` | `Meal_ID` | N:1 | **100% valid** |
| `Meals_Main` | `Food_ID` | `Food` | `Food_ID` | N:1 | **100% valid** |
| `Meals_Starter` | `Meal_ID` | `Meals` | `Meal_ID` | N:1 | **100% valid** |
| `Meals_Starter` | `Food_ID` | `Food` | `Food_ID` | N:1 | 100% valid except 3 orphan IDs: `6`, `10`, `19` |
| `Food` | `Ingredient_ID` | `Ingredient` | `Ingredient_ID` | N:1 | **100% valid** |
| `Food` | `Food_Type_ID` | `FoodType` | `Food_Type_ID` | N:1 | **100% valid** |
| `Food` | `Food_Category` | `FoodCat` | `FoodCat` | N:1 | **100% valid** |
| `Ingredient` | `Ingredient_Category` | `FoodCat` | `FoodCat` | N:1 | **100% valid** |
| `Meals_Photo` | `Meal_ID` | `Meals` | `Meal_ID` | N:1 | **100% valid** (on non-spill rows) |
| `Meals_People` | `Meal_ID` | `Meals` | `Meal_ID` | N:1 | **100% valid** |
| `Meals_People` | `People_ID` | `People_Public` | `People_ID` | N:1 | **100% valid** |

---

## 4. Restaurant Location Model

The authoritative geographical hierarchy is strictly established by the newly exposed `City` and `Country` worksheets:

```text
Rest.City_ID ──► City.City_ID
                  City.Country_ID ──► Country.Country_ID
```

### Key Verification
* **`Rest`:** Contains foreign key `City_ID`. Every restaurant record with a non-blank `Rest_ID` contains a valid `City_ID` (723 distinct IDs).
* **`City`:** 730 records. Primary key is `City_ID`. Column `City_Text` provides the official city name. Column `Country_ID` is a 100% populated foreign key pointing to `Country`.
* **`Country`:** 55 records. Primary key is `Country_ID`. Column `Country_Text` provides the country name. Column `ISOCode` provides the 2-letter ISO standard code. Coordinates `CountryLong` and `CountryLang` provide country centroid markers.

> [!NOTE]
> `Rest` also contains a legacy column `London_ID`. Because no `London` lookup table is exposed in the workbook and London is fully modeled as `City_ID = 190` (`City_Text = "London"`, `Country_ID = 9` / England), `London_ID` is treated as a deprecated legacy field and not required for public location resolution.

---

## 5. Food Model

Dish cataloging, categorisation, and ingredient classification are supported by four interrelated tables:

```text
[Meals_Main / Meals_Starter]
       │
       ▼ (Food_ID)
     Food
       ├── (Ingredient_ID) ──► Ingredient ──► (Ingredient_Category) ──► FoodCat
       ├── (Food_Type_ID)   ──► FoodType
       └── (Food_Category)  ──────────────────────────────────────────► FoodCat
```

* **`Food` (2,840 records):**
  * `Food_ID`: Master primary key.
  * `Food_Text`: The dish description / menu title (e.g., "Californian Burger", "Roast Duck Breast").
  * `Ingredient_ID`: Resolves to the dominant ingredient in `Ingredient`.
  * `Food_Type_ID`: Resolves to the dish presentation type in `FoodType`.
  * `Food_Category`: Direct foreign key string to `FoodCat`.
* **Denormalized Columns in Source `Food`:**
  * `Food_Type`: Duplicate of `FoodType.FoodType` (ignore in favor of joining `FoodType`).
  * `#_Mains`, `#_Starters`, `#_Pud`, `#_Total`: Precalculated occurrence counters. The application should calculate dynamic counts from operational tables if needed.

---

## 6. Companion Privacy Model

The public application must enforce strict privacy controls for dining companions:

```text
Meals_People (Junction: Meal_ID, People_ID)
       │
       ▼ (People_ID)
People_Public (People_ID, Public_Name, Public?, Count_Meals)
```

### Privacy Constraints & Rules
1. **Zero Access to `People`:** The raw `People` worksheet is completely excluded from the application loader.
2. **Authoritative Name Source:** The public application must **only** display `People_Public.Public_Name`.
3. **Never Fall Back to Private Names:** If a companion has `Public?` set to `'N'` or `'n'`, `People_Public.Public_Name` holds the literal value `"Hidden name"`. The application must never attempt to uncover or bypass this mask.
4. **Public Flag:** Only records where `Public? == 'Y'` expose real names (102 individuals out of 1,009 active people).

---

## 7. Photo Model

Media assets are cataloged in `Meals_Photo`:

```text
Meals ──(1:N)──► Meals_Photo
```

* **Asset Hosting:** Photos are hosted on Google Cloud Storage under public URLs:
  `https://storage.googleapis.com/shm-photos/{PhotoName}.jpg`
* **Resolution Rule:**
  * `PhotoName` contains the standardized asset key (e.g., `2562_1`, `215_3`).
  * `Photo_Comment` provides the optional caption text.
* **Denormalized Source Fields:**
  * Columns `Rest_ID` and `Rest_Name` in `Meals_Photo` are redundant lookups from the parent `Meal_ID`. The application must resolve the restaurant via `Meals.Rest_ID`.
  * Column `Old_Location` is 100% empty (null) and must be ignored.
  * Column `PhotoLocal` contains legacy local disk path strings and must be ignored in favor of the public URL.

---

## 8. Row Filtering Rules

When loading source worksheets, the following runtime exclusion filters must be applied to drop trailing spreadsheet formula rows and pre-allocated empty records:

| Worksheet | Row Filtering Rule | Filter Rationale |
| :--- | :--- | :--- |
| **`Rest`** | Keep rows where `Rest_ID IS NOT NULL AND Rest_ID != ''` | Drops 776 trailing formula-spill rows (rows 3,055–3,830) where `#_Meals = 0`. |
| **`Meals_Photo`** | Keep rows where `Photo_ID IS NOT NULL` AND `PhotoName IS NOT NULL` AND `PhotoName != ''` | Drops 201 formula-extended rows where the formula generated invalid URL `https://storage.googleapis.com/shm-photos/.jpg`. |
| **`People_Public`**| Keep rows where `People_ID <= 1009` (or `People_Name IS NOT NULL AND People_Name != ''`) | Drops 990 trailing pre-allocated empty template rows (IDs 1,010 to 1,999). |
| **`Meals_Main`** | Keep rows where `Meals_Main_ID IS NOT NULL` | Drops potential blank rows. |
| **`Meals_Starter`**| Keep rows where `Meals_Starter_ID IS NOT NULL` | Drops potential blank rows. |
| **`Meals_People`** | Keep rows where `Meal_ID IS NOT NULL AND People_ID IS NOT NULL` | Filters junction integrity. |
| **`City`** | Keep rows where `City_ID IS NOT NULL` | Drops empty rows. |
| **`Country`** | Keep rows where `Country_ID IS NOT NULL` | Drops empty rows. |

---

## 9. Field Normalisation Rules

The ingestion loader must normalize raw spreadsheet values into standard application types:

### 1. Dates
* **Source format:** String `DD/MM/YYYY` in `Meals.Date_Visited` (e.g., `"01/05/1994"`, `"23/10/2026"`).
* **Target format:** ISO-8601 Date string (`YYYY-MM-DD`).
* **Note:** `Year` can be preserved as an integer for fast faceted indexing.

### 2. Currency & Values
* **Source format:** Formatted string in `Meals.Meal_Value` (e.g., `"£20.00"`, `"£0.00"`).
* **Target format:** Numeric floating-point decimal (e.g., `20.00`, `0.00`) or integer pence/cents (`2000`).
* **Transformation:** Strip currency symbol (`£`, encoded in Windows-1252 as `\xa3`), whitespace, and parse as float. Null/empty strings default to `null`.

### 3. Booleans
* **Source formats:** Mixed strings and booleans:
  * `Meals.AFC_Game`: Values include `'Yes'`, `'TRUE'`, `'No'`, `'FALSE'`.
  * `Meals.Business`: Values include `'Yes'`, `'No'`, `'FALSE'`.
  * `People_Public.Public?`: Values include `'Y'`, `'N'`, `'n'`.
* **Transformation:**
  * Truthy: `'YES'`, `'TRUE'`, `'Y'` → `true`.
  * Falsy: `'NO'`, `'FALSE'`, `'N'`, `null` → `false`.

### 4. Latitude & Longitude
* **`Rest` coordinates:**
  * `Rest X Cords` → Latitude (decimal float, range -90.0 to 90.0).
  * `Rest Y Cords` → Longitude (decimal float, range -180.0 to 180.0).
* **`Country` coordinates:**
  * `CountryLong` → Latitude (decimal float, e.g., `-24.9162` for Australia).
  * `CountryLang` → Longitude (decimal float, e.g., `133.3931` for Australia).

### 5. Google Places Literals & Ratings
* **`Rest.GName2`:** If value equals `'No results found'`, `'Not looked up'`, or begins with `'Error occurred:'`, normalise to `null`.
* **`Rest.GRating2`:** Parse to float. If empty or invalid, normalise to `null`.
* **`Rest.GURL2`:** Trim whitespace; if not starting with `http`, normalise to `null`.

---

## 10. Known Source Data Issues

These are documented source data defects in the Google Sheet. In accordance with project instructions, **do not repair or fabricate records** in application code. The loader must handle them gracefully:

```text
KNOWN SOURCE DATA ISSUE: Broken Foreign Keys in Meals.Rest_ID
 - Meal_ID = 4293 (Visited 27/05/2022) references Rest_ID = 2655
 - Meal_ID = 4298 (Visited 04/06/2022) references Rest_ID = 2661
 Impact: Rest_ID 2655 and 2661 do not exist in the Rest table.
 Handling: When rendering Meals 4293 and 4298, the restaurant relationship will fail to resolve. The loader should keep restaurant as null rather than failing the entire load.
```

```text
KNOWN SOURCE DATA ISSUE: Broken Foreign Keys in Meals_Photo.Rest_ID
 - Photo_ID = 2577 (Meal_ID 4293) references Rest_ID = 2655
 - Photo_ID = 2582 (Meal_ID 4298) references Rest_ID = 2661
 Impact: References the same non-existent restaurants above.
 Handling: Derive restaurant from Meals; photo links to meal normally.
```

```text
KNOWN SOURCE DATA ISSUE: Broken Foreign Keys in Meals_Starter.Food_ID
 - Meals_Starter_ID = 638 (Meal_ID 1954) references Food_ID = 6
 - Meals_Starter_ID = 384 (Meal_ID 874) references Food_ID = 10
 - Meals_Starter_ID = 590, 691, 710, 711, 748, 749, 751 (Meal_IDs 1800, 2504, 2594, 2595, 2755, 2761, 2769) reference Food_ID = 19
 Impact: Food_ID values 6, 10, and 19 do not exist in Food (table skips 5→7, 9→11, 18→20).
 Handling: Starters referencing these missing IDs will not resolve food item details. Set food to null.
```

```text
KNOWN SOURCE DATA ISSUE: Duplicate Primary Key in Meals_People.Meals_People_ID
 - 32 surrogate key values are duplicated across 60 rows in Meals_People (e.g., IDs 15216 to 15225 repeated).
 Impact: Meals_People_ID is not reliably unique.
 Handling: Use composite primary key (Meal_ID, People_ID) or generate a new sequential surrogate ID during data ingestion.
```

---

## 11. Dessert / Pudding Status

* **Occurrence Table Existence:** **None exists.** Reinspection of the workbook (including previously hidden tabs) confirms there is **no** `Meals_Pud`, `Meals_Dessert`, or equivalent occurrence table.
* **V1 Model Decision:** Pudding/dessert occurrence detail is **excluded from the V1 application model**.
* **Aggregate Counter Policy:** In accordance with specifications, dessert records will **not** be synthesized or inferred from the `#_Pud` counter on the `Food` table.

---

## 12. Proposed Enriched Meal Object

Below is the conceptual JSON structure for the enriched Meal entity assembled by the application for display and search:

```json
{
  "id": 4890,
  "date": "2025-10-14",
  "year": 2025,
  "rating": "Very Good",
  "value": 35.00,
  "currency": "GBP",
  "sentiment": "Delighted",
  "sentimentCategory": "Positive",
  "comment": "Superb dinner with outstanding flavours.",
  "isBusiness": false,
  "arsenalMatch": {
    "isMatchDay": true,
    "opponent": "Chelsea",
    "scoreArsenal": 2,
    "scoreOpponent": 1,
    "comment": "Great pre-match dinner before a huge win!"
  },
  "restaurant": {
    "id": 1434,
    "name": "Tribeca Grill",
    "address": "375 Greenwich St, New York, NY 10013",
    "type": {
      "id": 4,
      "name": "American"
    },
    "location": {
      "latitude": 40.7195,
      "longitude": -74.0098,
      "googleMapsUrl": "https://maps.google.com/?cid=1234567890",
      "googleRating": 4.5,
      "websiteUrl": "https://www.tribecagrill.com"
    },
    "city": {
      "id": 231,
      "name": "New York",
      "country": {
        "id": 51,
        "name": "USA",
        "isoCode": "US"
      }
    }
  },
  "starters": [
    {
      "occurrenceId": 380,
      "rating": "Very Good",
      "food": {
        "id": 142,
        "name": "Calamari Fritti",
        "category": "Seafood",
        "foodType": "Appetizer",
        "ingredient": {
          "id": 84,
          "name": "Squid",
          "category": "Seafood"
        }
      }
    }
  ],
  "mains": [
    {
      "occurrenceId": 4510,
      "rating": "Superb",
      "comment": "Cooked to perfection.",
      "food": {
        "id": 571,
        "name": "Fillet of Beef",
        "category": "Meat",
        "foodType": "Steak",
        "ingredient": {
          "id": 15,
          "name": "Beef",
          "category": "Meat"
        }
      }
    }
  ],
  "photos": [
    {
      "id": 1820,
      "url": "https://storage.googleapis.com/shm-photos/4890_1.jpg",
      "comment": "Main course presentation"
    }
  ],
  "companions": [
    {
      "peopleId": 193,
      "publicName": "David Smith",
      "isPublic": true
    },
    {
      "peopleId": 412,
      "publicName": "Hidden name",
      "isPublic": false
    }
  ]
}
```

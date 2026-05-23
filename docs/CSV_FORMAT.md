# CSV Import Format

The `pnpm db:import` script reads a CSV file and creates/updates Community
rows. Column headers are matched **case-insensitively** and tolerate spaces,
underscores or hyphens. Unrecognised columns are ignored (and listed in the
console output) so you can keep extra columns in your spreadsheet.

## Quick start

```bash
# Preview what would be imported, without writing anything
pnpm db:import ./communities.csv --dry-run

# Import as UNVERIFIED (default — they don't appear publicly yet)
pnpm db:import ./communities.csv

# Import and publish immediately
pnpm db:import ./communities.csv --publish
```

Re-running on the same file is safe — communities are upserted by slug
(`name + suburb + state`).

## Required columns

| Field         | Accepted header names                                  | Example       |
|---------------|--------------------------------------------------------|---------------|
| Name          | `name`, `community name`, `community`, `park name`     | Banksia Grove |
| Address       | `address`, `street address`, `address line 1`          | 12 Banksia Dr |
| Suburb        | `suburb`, `town`, `locality`, `city`                   | Mandurah      |
| State         | `state` — abbreviation or full name                    | WA / Western Australia |
| Postcode      | `postcode`, `post code`, `zip`                         | 6210          |

If any of these are missing, the import will fail with a clear error.

## Optional columns

### Location

| Field      | Accepted header names | Notes                                      |
|------------|-----------------------|--------------------------------------------|
| Latitude   | `lat`, `latitude`     | Decimal, eg `-32.5269`                     |
| Longitude  | `lng`, `lon`, `long`, `longitude` | Decimal, eg `115.7217`         |

Missing coordinates? Leave them blank and add Mapbox geocoding later — the
schema is ready, the script just won't fill them in.

### Content

| Field             | Accepted header names                            |
|-------------------|--------------------------------------------------|
| Short description | `short description`, `tagline`, `summary`        |
| Description       | `description`, `about`, `overview`               |
| Website           | `website`, `url`, `web`                          |
| Phone             | `phone`, `telephone`, `contact phone`            |
| Email             | `email`, `enquiry email`, `contact email`        |

### Lifestyle flags (boolean)

These accept `yes`/`no`, `true`/`false`, `1`/`0`, `Y`/`N`, or empty.

| Field         | Accepted header names                          |
|---------------|------------------------------------------------|
| Pet friendly  | `pet friendly`, `pets`, `pets allowed`         |
| Over 50s only | `over 50s`, `over 50s only`, `age restricted`  |
| Coastal       | `coastal`, `coastal location`, `near beach`    |

### Site fees

| Field         | Accepted header names                          | Notes                       |
|---------------|------------------------------------------------|-----------------------------|
| Min fees      | `site fees`, `site fees min`, `fees min`, `fee min` | Dollars (no $ needed). Stored as cents internally. |
| Max fees      | `site fees max`, `fees max`, `fee max`         | Dollars                     |
| Frequency     | `fee frequency`, `fees frequency`              | `weekly`/`fortnightly`/`monthly`/`annually`, or `pw`/`pf`/`pm`/`pa` |

### Other

| Field             | Accepted header names                                       |
|-------------------|-------------------------------------------------------------|
| Age restriction   | `age restriction`, `minimum age`, `min age`                 |
| Total homes       | `total homes`, `homes`, `sites`, `number of homes`          |
| Year established  | `year established`, `established`, `year`, `opened`         |
| Kind              | `kind`, `type` — `land lease`, `lifestyle village`, `over 50s`, `manufactured home`, `caravan park`, `retirement village` |
| Operator name     | `operator`, `operator name`, `company`                      |
| Operator website  | `operator website`, `operator url`                          |

If `operator` is set, a matching `Operator` row is created (or reused) and
linked to the community.

## Example minimal CSV

```csv
Community Name,Address,Suburb,State,Postcode,Pet Friendly,Over 50s,Site Fees Min,Site Fees Max,Fee Frequency
Banksia Grove,12 Banksia Drive,Mandurah,WA,6210,Yes,Yes,165,189,weekly
Whitehaven Lifestyle,88 Whitehaven Way,Hervey Bay,QLD,4655,Yes,Yes,172,195,weekly
```

That will import two communities. Drop in extra columns (lat, lng,
description, etc.) as you have them — the importer picks up whatever it
recognises and ignores the rest.

## Workflow recommendation

1. Always run with `--dry-run` first. You'll see how many columns were
   matched, what was ignored, and which rows have validation errors —
   without touching the database.
2. Fix issues in the spreadsheet, re-run dry.
3. When clean, drop `--dry-run` to import as `UNVERIFIED`.
4. Spot-check in Prisma Studio (`pnpm db:studio`) → Community table.
5. Either set `status = PUBLISHED` row by row, or re-run with `--publish`
   to flip them all.

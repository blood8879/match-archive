# Database Schema (ERD)

```mermaid
erDiagram
    USERS ||--o{ TEAM_MEMBERS : "joins"
    TEAMS ||--o{ TEAM_MEMBERS : "has"
    TEAMS ||--o{ MATCHES : "hosts"
    MATCHES ||--o{ MATCH_RECORDS : "contains"
    MATCH_RECORDS }|--|| USERS : "links_to_user"
    MATCHES ||--o{ GOALS : "has_goals"
    
    USERS {
        uuid id PK "Supabase Auth ID"
        string email
        string name "Real Name"
        string nickname "Display Name"
        string position "FW, MF, DF, GK"
        string avatar_url
        timestamp created_at
    }

    TEAMS {
        uuid id PK
        string name
        string emblem_url
        string region "Activity Area"
        uuid owner_id FK "Manager"
        string code "Invite Code"
        integer member_count
        timestamp created_at
    }

    TEAM_MEMBERS {
        uuid id PK
        uuid team_id FK
        uuid user_id FK "Nullable if Guest"
        string role "OWNER, MANAGER, MEMBER"
        string status "active, pending"
        boolean is_guest "True if guest player"
        string guest_name "Guest Name if is_guest=true"
        integer back_number
        timestamp joined_at
    }

    MATCHES {
        uuid id PK
        uuid team_id FK "Host Team"
        string opponent_name "Opponent Team Name"
        timestamp match_date
        string location
        string status "SCHEDULED, FINISHED, CANCELED"
        integer quarters "Default 4"
        integer home_score
        integer away_score
        timestamp created_at
    }

    MATCH_RECORDS {
        uuid id PK
        uuid match_id FK
        uuid team_member_id FK "Who played"
        integer quarters_played "Count of quarters"
        integer goals
        integer assists
        boolean is_mom "Man of the Match"
        boolean clean_sheet "GK only"
        string position_played
        timestamp created_at
    }

    GOALS {
        uuid id PK
        uuid match_id FK
        uuid team_member_id FK "Scorer (Nullable for Own Goal)"
        uuid assist_member_id FK "Assist (Nullable)"
        integer quarter
        string type "NORMAL, PK, FREEKICK, OWN_GOAL"
        timestamp created_at
    }
```

> [!NOTE]
> **Key Design Decisions**
> 1. **Mixed Membership**: `TEAM_MEMBERS` can represent both real users (`user_id` is set) and guests (`user_id` is null, `is_guest` is true).
> 2. **Own Goal Handling**: `GOALS` table has `type='OWN_GOAL'`. In this case, `team_member_id` determines WHO made the mistake (optional) OR it can be null. But importantly, logic must count this towards the OPPONENT's score but NOT the player's personal goal count.
> 3. **Denormalization**: `MATCHES` stores `home_score`, `away_score` for fast read, but it must strictly match `count(GOALS)` via Application Logic or Database Trigger.

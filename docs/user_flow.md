# User Flow

```mermaid
flowchart TD
    %% Start
    Start((Start)) --> AuthCheck{Logged In?}
    
    %% Auth
    AuthCheck -- No --> Landing[Landing Page]
    Landing --> Login[Login / Sign Up]
    Login --> Onboarding[Onboarding Profile]
    Onboarding --> AuthCheck
    
    %% Main Dashboard
    AuthCheck -- Yes --> Dashboard[User Dashboard\n(My Stats / Team List)]
    
    %% Team Management
    Dashboard --> CreateTeam{Create or Join?}
    CreateTeam -- Create --> FormTeam[Form New Team]
    FormTeam --> Recruit[Invite Members]
    CreateTeam -- Join --> SearchTeam[Search Teams]
    SearchTeam --> RequestJoin[Request Join]
    RequestJoin --> WaitApproval(Wait Approval)
    
    %% Match Cycle (Core Loop)
    Dashboard --> SelectTeam[Select Team Context]
    SelectTeam --> TeamHome[Team Locker Room]
    
    TeamHome --> MatchAction{Role?}
    
    %% Manager Actions
    MatchAction -- Manager --> CreateMatch[Create Match Schedule]
    CreateMatch --> MatchList[Match List]
    MatchList --> MatchDay{Match Day?}
    MatchDay -- Yes --> Lineup[Set Lineup / Quarters]
    Lineup --> PlayMatch[Play Match]
    PlayMatch --> InputResult[Input Score & Stats]
    
    %% Guest/Own Goal Handling
    InputResult --> CheckIntegrity{Score == Stats?}
    CheckIntegrity -- No --> Error[Show Error: Check Sum]
    Error --> InputResult
    
    CheckIntegrity -- Yes --> Commit[Save Match Record]
    Commit --> UpdateStats[Update Team/Player Stats]
    
    %% Viewer Actions
    MatchAction -- Member --> ViewMatch[View Match Details]
    ViewMatch --> ViewPersonal[View My Stats]
    
    %% End
    UpdateStats --> TeamHome
    
    classDef action fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef decision fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;
    classDef state fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    
    class Login,FormTeam,InputResult,Commit action;
    class AuthCheck,CreateTeam,MatchAction,CheckIntegrity,MatchDay decision;
    class Dashboard,TeamHome,MatchList state;
```

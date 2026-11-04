use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictStrategy {
    ServerWins,
    ClientWins,
    Merge,
}

/// Determines the conflict resolution strategy per entity type.
/// Approvals/status fields: server wins (authoritative workflow state).
/// Draft fields (description, notes): client wins.
pub fn conflict_strategy_for(entity: &str) -> ConflictStrategy {
    match entity {
        "approval" | "approval_stage" | "approval_instance" => ConflictStrategy::ServerWins,
        _ => ConflictStrategy::ClientWins,
    }
}

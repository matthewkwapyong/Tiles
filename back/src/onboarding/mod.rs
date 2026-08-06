pub mod routes;

use anyhow::Result;
use sqlx::PgPool;

/// Seed item configuration (tmdb_id, media_type, display_order).
pub static SEED_CURATED_ITEMS: &[(i32, &str, i32)] = &[
    // Movies (Popular & Classic Across Eras)
    (27205, "movie", 1),   // Inception
    (155, "movie", 2),     // The Dark Knight
    (680, "movie", 3),     // Pulp Fiction
    (157336, "movie", 4),  // Interstellar
    (278, "movie", 5),     // The Shawshank Redemption
    (550, "movie", 6),     // Fight Club
    (129, "movie", 7),     // Spirited Away
    (13, "movie", 8),      // Forrest Gump
    (496243, "movie", 9),  // Parasite
    (238, "movie", 10),    // The Godfather
    (603, "movie", 11),    // The Matrix
    (120, "movie", 12),    // The Lord of the Rings: The Fellowship of the Ring
    (19995, "movie", 13),  // Avatar
    (299536, "movie", 14), // Avengers: Infinity War
    (372058, "movie", 15), // Your Name.
    (597, "movie", 16),    // Titanic
    (11, "movie", 17),     // Star Wars: Episode IV - A New Hope
    (769, "movie", 18),    // Goodfellas
    (105, "movie", 19),    // Back to the Future
    (77338, "movie", 20),  // Whiplash
    (424, "movie", 21),    // Schindler's List
    (500, "movie", 22),    // Reservoir Dogs
    (508442, "movie", 23), // Soul
    (637, "movie", 24),    // Life Is Beautiful
    (315162, "movie", 25), // Puss in Boots: The Last Wish
    // TV Shows
    (1396, "tv", 26),      // Breaking Bad
    (1399, "tv", 27),      // Game of Thrones
    (60059, "tv", 28),     // Better Call Saul
    (2316, "tv", 29),      // The Office
    (66732, "tv", 30),     // Stranger Things
    (94605, "tv", 31),     // Arcane
    (100088, "tv", 32),    // The Last of Us
    (76479, "tv", 33),     // The Boys
    (46260, "tv", 34),     // Narcos
    (1668, "tv", 35),      // Friends
    (1104, "tv", 36),      // Mad Men
    (82856, "tv", 37),     // The Mandalorian
    (46648, "tv", 38),     // True Detective
    (62560, "tv", 39),     // The Crown
    (1418, "tv", 40),      // The Big Bang Theory
];

/// Seeds the `curated_onboarding_items` table with initial hand-picked TMDB IDs.
pub async fn seed_curated_onboarding_items(db: &PgPool) -> Result<()> {
    for &(tmdb_id, media_type, display_order) in SEED_CURATED_ITEMS {
        sqlx::query(
            r#"
            INSERT INTO curated_onboarding_items (tmdb_id, media_type, display_order)
            VALUES ($1, $2, $3)
            ON CONFLICT (tmdb_id, media_type) DO UPDATE SET
                display_order = EXCLUDED.display_order
            "#,
        )
        .bind(tmdb_id)
        .bind(media_type)
        .bind(display_order)
        .execute(db)
        .await?;
    }
    Ok(())
}

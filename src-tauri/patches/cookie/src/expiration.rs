use time::OffsetDateTime;

/// A cookie's expiration: either a date-time or session.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Expiration {
    /// Expiration for a "permanent" cookie at a specific date-time.
    DateTime(OffsetDateTime),
    /// Expiration for a "session" cookie.
    Session,
}

impl Expiration {
    pub fn is_datetime(&self) -> bool {
        matches!(self, Expiration::DateTime(_))
    }

    pub fn is_session(&self) -> bool {
        matches!(self, Expiration::Session)
    }

    pub fn datetime(self) -> Option<OffsetDateTime> {
        match self {
            Expiration::Session => None,
            Expiration::DateTime(v) => Some(v),
        }
    }

    pub fn map<F>(self, f: F) -> Self
    where
        F: FnOnce(OffsetDateTime) -> OffsetDateTime,
    {
        match self {
            Expiration::Session => Expiration::Session,
            Expiration::DateTime(v) => Expiration::DateTime(f(v)),
        }
    }
}

// Replaced blanket impl<T: Into<Option<OffsetDateTime>>> with two specific impls
// to avoid E0119 coherence conflict with time >= 0.3.35's ModifierValue impls.

impl From<OffsetDateTime> for Expiration {
    fn from(dt: OffsetDateTime) -> Self {
        Expiration::DateTime(dt)
    }
}

impl From<Option<OffsetDateTime>> for Expiration {
    fn from(opt: Option<OffsetDateTime>) -> Self {
        match opt {
            Some(dt) => Expiration::DateTime(dt),
            None => Expiration::Session,
        }
    }
}

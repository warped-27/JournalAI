use time::OffsetDateTime;

/// A cookie's expiration: either a date-time or session.
///
/// An `Expiration` is constructible via:
///
///   * `None` -> `Expiration::Session`
///   * `Some(OffsetDateTime)` -> `Expiration::DateTime`
///   * `OffsetDateTime` -> `Expiration::DateTime`
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Expiration {
    /// Expiration for a "permanent" cookie at a specific date-time.
    DateTime(OffsetDateTime),
    /// Expiration for a "session" cookie. Browsers define the notion of a
    /// "session" and will automatically expire session cookies when they deem
    /// the "session" to be over. This is typically, but need not be, when the
    /// browser is closed.
    Session,
}

impl Expiration {
    /// Returns `true` if `self` is an `Expiration::DateTime`.
    pub fn is_datetime(&self) -> bool {
        matches!(self, Expiration::DateTime(_))
    }

    /// Returns `true` if `self` is an `Expiration::Session`.
    pub fn is_session(&self) -> bool {
        matches!(self, Expiration::Session)
    }

    /// Returns the inner `OffsetDateTime` if `self` is a `DateTime`.
    pub fn datetime(self) -> Option<OffsetDateTime> {
        match self {
            Expiration::Session => None,
            Expiration::DateTime(v) => Some(v),
        }
    }

    /// Applies `f` to the inner `OffsetDateTime` if `self` is a `DateTime`
    /// and returns the mapped `Expiration`.
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

// Replaced blanket impl<T: Into<Option<OffsetDateTime>>> with two specific
// impls to avoid E0119 coherence conflict with time >= 0.3.35.

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

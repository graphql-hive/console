ALTER TABLE
  public.tokens
ADD COLUMN
  token_alias VARCHAR(64) NOT NULL DEFAULT REPEAT('*', 64);

ALTER TABLE
  public.tokens
ALTER COLUMN
  token
TYPE
  VARCHAR(64);

UPDATE
  public.tokens
SET
  token_alias = CONCAT(
    SUBSTRING(
      token
      FROM
        1 FOR 3
    ),
    REPEAT('*', 26),
    SUBSTRING(
      token
      FROM
        30 FOR 3
    )
  ),
  token = ENCODE(SHA256(token::bytea), 'hex');

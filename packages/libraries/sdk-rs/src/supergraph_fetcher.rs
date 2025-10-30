use std::time::Duration;

#[derive(Debug)]
pub struct SupergraphFetcher {
    client: reqwest::blocking::Client,
    endpoint: String,
    key: String,
    user_agent: String,
    etag: Option<String>,
}

impl SupergraphFetcher {
    pub fn try_new(
        endpoint: String,
        key: String,
        user_agent: String,
        connect_timeout: Duration,
        request_timeout: Duration,
        accept_invalid_certs: bool,
    ) -> Result<Self, String> {
        let mut endpoint = endpoint;
        if !endpoint.ends_with("/supergraph") {
            if endpoint.ends_with("/") {
                endpoint.push_str("supergraph")
            } else {
                endpoint.push_str("/supergraph")
            }
        }

        let client = reqwest::blocking::Client::builder()
            .danger_accept_invalid_certs(accept_invalid_certs)
            .connect_timeout(connect_timeout)
            .timeout(request_timeout)
            .build()
            .map_err(|e| e.to_string())?;

        Ok(Self {
            client,
            endpoint,
            key,
            user_agent,
            etag: None,
        })
    }

    pub fn fetch_supergraph(&mut self) -> Result<Option<String>, String> {
        let mut headers = reqwest::header::HeaderMap::new();

        headers.insert(
            reqwest::header::USER_AGENT,
            reqwest::header::HeaderValue::from_str(&self.user_agent).unwrap(),
        );
        headers.insert("X-Hive-CDN-Key", self.key.parse().unwrap());

        if let Some(checksum) = &self.etag {
            headers.insert("If-None-Match", checksum.parse().unwrap());
        }

        let resp = self
            .client
            .get(self.endpoint.as_str())
            .headers(headers)
            .send()
            .map_err(|e| e.to_string())?;

        match resp.headers().get("etag") {
            Some(checksum) => {
                let etag = checksum.to_str().map_err(|e| e.to_string())?;
                self.update_latest_etag(Some(etag.to_string()));
            }
            None => {
                self.update_latest_etag(None);
            }
        }

        if resp.status().as_u16() == 304 {
            return Ok(None);
        }

        Ok(Some(resp.text().map_err(|e| e.to_string())?))
    }

    fn update_latest_etag(&mut self, etag: Option<String>) {
        self.etag = etag;
    }
}

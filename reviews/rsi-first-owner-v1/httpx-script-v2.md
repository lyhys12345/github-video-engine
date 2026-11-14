# HTTPX: what comes back from a GET?

**Owner review draft.** 26 seconds estimated, 9:16, for general developers. The silent engineering trial carries the full explanation on screen. The spoken copy is optional text for review. The diagrams illustrate documented source behavior. The renderer adds its fixed source-illustration notice in Chinese above these English annotations.

| Time | Visible English annotations | Diagram action and exact card labels | Optional spoken copy |
| --- | --- | --- | --- |
| 0:00.0–0:04.5 | **HTTPX for Python** / Get an HTTP response / README example | Start with the GET and 200 OK cards visible; highlight the documented response. The README example annotation is visible throughout. Card labels — GET / 200 OK. | One request, one response. This is HTTPX, an HTTP client for Python. |
| 0:04.5–0:11.0 | **Give it a URL** / Calls request with GET / Call diagram | Show the public Python call on the left. An arrow and a traveling token lead right to a shorthand for its shared request call. The call diagram represents source-level delegation. Card labels — httpx.get(url) / request("GET", url). | Pass a URL to HTTPX dot get. It forwards the URL to the shared request function. |
| 0:11.0–0:17.0 | **Inspect the Response** / Status, headers, body / README example | Reveal three cards from left to right. Each shows the Python field and a short value from the documented example. The header label refers to Content-Type. Card labels — status_code: 200 / headers: text/html / text: HTML. | The example lets you read the status, the response headers, and the body as text. |
| 0:17.0–0:21.5 | **These are example values** / GET to www.example.org / No live request here | Show one centered card labeled 200 OK and emphasize the value under the visible example boundary. The annotation identifies the documented request host. Card labels — 200 OK. | These values come from the HTTPX README example for example dot org. |
| 0:21.5–0:26.0 | **Check what came back** / Read status and type / Then read the body text | Hold three field names as a practical checklist. The title and two annotation lines explain the reading order. Card labels — Status / Content-Type / Body text. | Check the status and content type before using the response body. |

The sequence opens directly with the response, uses hard cuts, and ends on the status, type and body checklist. Each shot uses supported annotation, label and motion fields. Readability and pacing await a rendered inspection after approval.

## Pinned sources

- HTTPX is an HTTP client library for Python. [README lines 16–16](<https://github.com/encode/httpx/blob/b5addb64f0161ff6bfe94c124ef76f6a1fba5254/README.md#L16-L16>).
- The HTTPX README demonstrates a GET to https://www.example.org/ and shows a 200 OK response. [README lines 29–34](<https://github.com/encode/httpx/blob/b5addb64f0161ff6bfe94c124ef76f6a1fba5254/README.md#L29-L34>).
- The top-level get helper takes a URL and calls the shared request function with method GET and that URL. [Python API lines 174–176](<https://github.com/encode/httpx/blob/b5addb64f0161ff6bfe94c124ef76f6a1fba5254/httpx/_api.py#L174-L176>) [Python API lines 195–198](<https://github.com/encode/httpx/blob/b5addb64f0161ff6bfe94c124ef76f6a1fba5254/httpx/_api.py#L195-L198>).
- The README inspects the Response via status_code, headers and text to read its status, Content-Type and body text. [README lines 31–38](<https://github.com/encode/httpx/blob/b5addb64f0161ff6bfe94c124ef76f6a1fba5254/README.md#L31-L38>).
- The README example shows status 200, a text/html Content-Type with UTF-8 charset, and abbreviated HTML body text. [README lines 30–38](<https://github.com/encode/httpx/blob/b5addb64f0161ff6bfe94c124ef76f6a1fba5254/README.md#L30-L38>).
- After receiving a response, a developer can inspect its status and content type before using the body text. [README lines 30–38](<https://github.com/encode/httpx/blob/b5addb64f0161ff6bfe94c124ef76f6a1fba5254/README.md#L30-L38>).

package server

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func testFS() fstest.MapFS {
	return fstest.MapFS{
		"index.html":                        &fstest.MapFile{Data: []byte("<html>lottery</html>")},
		"_next/static/app.js":               &fstest.MapFile{Data: []byte("js")},
		"gifts/l1-luggage.png":              &fstest.MapFile{Data: []byte{0x89, 0x50}},
		"audio/rolling.mp3":                 &fstest.MapFile{Data: []byte{0x49, 0x44}},
		"audio/win.mp3":                     &fstest.MapFile{Data: []byte{0x49, 0x44}},
	}
}

func get(t *testing.T, h http.Handler, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestRootRedirectsToBasePath(t *testing.T) {
	h := New(testFS())
	rec := get(t, h, "/")
	if rec.Code != http.StatusFound {
		t.Fatalf("/ = %d, want 302", rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/wedding-lottery/" {
		t.Fatalf("Location = %q", loc)
	}
}

func TestBasePathWithoutSlashRedirects(t *testing.T) {
	h := New(testFS())
	rec := get(t, h, "/wedding-lottery")
	if rec.Code != http.StatusFound {
		t.Fatalf("/wedding-lottery = %d, want 302", rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/wedding-lottery/" {
		t.Fatalf("Location = %q", loc)
	}
}

func TestIndexPathServed(t *testing.T) {
	h := New(testFS())
	rec := get(t, h, "/wedding-lottery/")
	if rec.Code != http.StatusOK {
		t.Fatalf("/wedding-lottery/ = %d, want 200", rec.Code)
	}
	body, _ := io.ReadAll(rec.Body)
	if !strings.Contains(string(body), "lottery") {
		t.Fatalf("body = %q", body)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
		t.Fatalf("Content-Type = %q", ct)
	}
}

func TestUnderscoreNextAssetReachable(t *testing.T) {
	h := New(testFS())
	rec := get(t, h, "/wedding-lottery/_next/static/app.js")
	if rec.Code != http.StatusOK {
		t.Fatalf("_next asset = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "text/javascript; charset=utf-8" {
		t.Fatalf("Content-Type = %q", ct)
	}
}

func TestMp3ContentType(t *testing.T) {
	h := New(testFS())
	rec := get(t, h, "/wedding-lottery/audio/rolling.mp3")
	if rec.Code != http.StatusOK {
		t.Fatalf("mp3 = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "audio/mpeg" {
		t.Fatalf("Content-Type = %q, want audio/mpeg", ct)
	}
}

func TestGiftImageReachable(t *testing.T) {
	h := New(testFS())
	rec := get(t, h, "/wedding-lottery/gifts/l1-luggage.png")
	if rec.Code != http.StatusOK {
		t.Fatalf("gift = %d, want 200", rec.Code)
	}
}

func TestUnknownPath404(t *testing.T) {
	h := New(testFS())
	// 注：ServeMux 会先规范化 .. 路径并 301，此处只测真正的未知路径。
	for _, p := range []string{"/wedding-lottery/nope", "/other"} {
		rec := get(t, h, p)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("%s = %d, want 404", p, rec.Code)
		}
	}
}

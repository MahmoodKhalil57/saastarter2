#!/usr/bin/env python3
"""One-shot codemod: wa-card / wa-button / wa-badge -> plain HTML + CSS.

These three were doing tier-1 jobs (a bordered box, a styled control, a
pill) with tier-5 machinery, so nothing rendered until their classes
registered. Plain elements render from the HTML alone; Web Awesome stays
for the genuinely interactive widgets.

Kept deliberately dumb and auditable: it maps attributes to classes and
leaves anything it does not understand alone, loudly.
"""
import re
import sys
from pathlib import Path

BTN_CLASS = {
    ("brand", None): "s2-btn s2-btn-brand",
    ("brand", "outlined"): "s2-btn s2-btn-outline",
    ("brand", "plain"): "s2-btn s2-btn-plain",
    ("danger", "plain"): "s2-btn s2-btn-plain s2-btn-danger",
    ("danger", "outlined"): "s2-btn s2-btn-danger",
    ("danger", None): "s2-btn s2-btn-danger",
    ("neutral", "outlined"): "s2-btn s2-btn-quiet",
    ("neutral", None): "s2-btn s2-btn-quiet",
    (None, "outlined"): "s2-btn s2-btn-quiet",
    (None, "plain"): "s2-btn s2-btn-plain",
    (None, None): "s2-btn s2-btn-quiet",
}
SIZE_CLASS = {"s": " s2-btn-s", "l": " s2-btn-l", None: ""}
TAG_CLASS = {"brand": "s2-tag s2-tag-brand", "success": "s2-tag s2-tag-success", "neutral": "s2-tag", None: "s2-tag"}

ATTR = re.compile(r"""(\w[\w-]*)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')""")


def attrs_of(raw):
    return {m.group(1): m.group(2)[1:-1] for m in ATTR.finditer(raw)}


def rest_attrs(raw, drop):
    out = []
    for m in ATTR.finditer(raw):
        if m.group(1) not in drop:
            out.append(f"{m.group(1)}={m.group(2)}")
    # bare attributes (disabled, inline, ...)
    for bare in re.findall(r"(?:^|\s)(disabled|inline|required|readonly|open)(?=\s|$)", raw):
        out.append(bare)
    return (" " + " ".join(out)) if out else ""


def convert_buttons(text, report):
    def repl(match):
        raw = match.group(1)
        a = attrs_of(raw)
        variant = a.get("variant")
        appearance = a.get("appearance")
        # a dynamic variant (a ${} expression) can't be mapped statically
        if variant and "${" in variant:
            report.append(f"  dynamic variant left as-is: {variant[:40]}")
            return match.group(0)
        key = (variant, appearance)
        if key not in BTN_CLASS:
            report.append(f"  unmapped button variant/appearance: {key}")
            return match.group(0)
        cls = BTN_CLASS[key] + SIZE_CLASS.get(a.get("size"))
        if "class" in a:
            cls += " " + a["class"]
        keep = rest_attrs(raw, {"variant", "appearance", "size", "class"})
        tag = "a" if "href" in a else "button"
        extra = "" if tag == "a" else ' type="button"'
        return f'<{tag} class="{cls}"{extra}{keep}>'

    text = re.sub(r"<wa-button((?:[^>\"']|\"[^\"]*\"|'[^']*')*?)>", repl, text)
    return text


def convert(path: Path):
    text = original = path.read_text()
    report = []

    text = convert_buttons(text, report)
    # closing tags: only those whose opener we converted (all of them, when
    # no unmapped opener remains)
    if "<wa-button" not in text:
        text = text.replace("</wa-button>", "</button>")
    text = re.sub(r"<wa-card((?:[^>\"']|\"[^\"]*\"|'[^']*')*?)>", lambda m: f'<div class="s2-card"{m.group(1)}>'
                  if "class=" not in m.group(1)
                  else f'<div{m.group(1).replace("class=\"", "class=\"s2-card ", 1)}>', text)
    text = text.replace("</wa-card>", "</div>")

    def badge(m):
        a = attrs_of(m.group(1))
        v = a.get("variant")
        if v and "${" in v:
            report.append("  dynamic badge variant left as-is")
            return m.group(0)
        return f'<span class="{TAG_CLASS.get(v, "s2-tag")}"{rest_attrs(m.group(1), {"variant"})}>'

    text = re.sub(r"<wa-badge((?:[^>\"']|\"[^\"]*\"|'[^']*')*?)>", badge, text)
    if "<wa-badge" not in text:
        text = text.replace("</wa-badge>", "</span>")

    if text != original:
        path.write_text(text)
    return report, text != original


targets = [p for p in Path("docs").rglob("*.html") if p.name != "lab.html"]
targets += [p for p in Path("docs/js").rglob("*.js") if ".gen." not in p.name]

changed = 0
for path in targets:
    report, did = convert(path)
    if did:
        changed += 1
    for line in report:
        print(f"{path}:{line}")
print(f"\nconverted in {changed} file(s)")
print("remaining wa-button/card/badge (intentional or unmapped):")
import subprocess

subprocess.run(["grep", "-rn", "-E", "<wa-(button|card|badge)", "docs", "--include=*.html", "--include=*.js"])

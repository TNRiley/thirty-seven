#!/usr/bin/env python3
"""Splice the payload and the script blocks into template.html -> index.html.
Keeps the data out of the conversation and the scripts out of one unreadable file."""
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HERE,'..','index.html')
tpl=open(os.path.join(HERE,'template.html')).read()
js=''.join(open(os.path.join(HERE,f'js{i}.js')).read() for i in range(1,8))
b64=open(os.path.join(HERE,'payload.b64')).read().strip()
html=tpl.replace('__PAYLOAD__', b64) + '\n' + js
open(OUT,'w').write(html)
print(f'wrote {OUT}  {len(html)/1e6:.2f} MB  (payload {len(b64)/1e6:.2f} MB)')

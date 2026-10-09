"""Refresh Scholar data; failed requests never replace the published snapshot."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from scholarly import scholarly


def make_snapshot(author):
    count = author.get('citedby')
    if isinstance(count, bool) or not isinstance(count, int) or count < 0:
        raise ValueError('Scholar did not return a valid total citation count')
    if author.get('scholar_id') != os.environ.get('GOOGLE_SCHOLAR_ID', '-YuCzI0AAAAJ'):
        raise ValueError('Scholar returned a different profile')
    return {'scholar_id': author['scholar_id'], 'name': author.get('name', 'Shuo Jiang'),
            'citedby': count, 'updated': datetime.now(timezone.utc).isoformat(), 'source': 'Google Scholar'}


def main():
    scholarly.set_timeout(30)
    scholarly.set_retries(2)
    author = scholarly.search_author_id(os.environ.get('GOOGLE_SCHOLAR_ID', '-YuCzI0AAAAJ'))
    author = scholarly.fill(author, sections=['basics', 'indices', 'counts'])
    snapshot = make_snapshot(author)
    output = Path(os.environ.get('OUTPUT_DIR', 'results'))
    output.mkdir(parents=True, exist_ok=True)
    (output / 'gs_data.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding='utf-8')
    badge = {'schemaVersion': 1, 'label': 'Citations', 'message': str(snapshot['citedby']), 'color': '315eea'}
    (output / 'gs_data_shieldsio.json').write_text(json.dumps(badge, indent=2), encoding='utf-8')
    print(f"Updated total citations: {snapshot['citedby']}")


if __name__ == '__main__':
    main()

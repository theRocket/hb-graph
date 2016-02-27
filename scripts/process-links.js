'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const _ = require('lodash');

const linkKinds = ['aquaintance', 'friend', 'worked with', 'co-worker'];
const defaultLinkKind = linkKinds[0];

function createLinkBetween(x, y, kind) {
	kind = kind || defaultLinkKind;
	return x < y ?
		{ source: x, target: y, kind } :
		{ source: y, target: x, kind };
}

fs.readFile(path.join(__dirname, '../data/users.json'), (err, data) => {
	if (err) throw err;

	const users = JSON.parse(data);
	const userIds = users.nodes.reduce((acc, elem, idx) => Object.assign({}, acc, { [elem.name]: idx }), {});

	fs.readFile(path.join(__dirname, '../data/links.txt'), (err, data) => {
		if (err) throw err;

		const links = yaml.safeLoad(data);

		const userLinks = _(Object.keys(links))
			// create a flat list of source->target + kind links
			.map(source =>
				Array.isArray(links[source]) ?
					// if it's just an array, there are no categories set up; produce link objects defaulted to "acquaintance"
					links[source].map(target => createLinkBetween(source, target)) :
					// otherwise, walk all of the link kind properties and produce link objects of the appropriate kind
					_.flatten(linkKinds.map(kind =>
						(links[source][kind] || []).map(target => createLinkBetween(source, target, kind)))))
			.flatten()
			// order the links by highest precedence, then order by source names
			.orderBy([x => linkKinds.indexOf(x.kind), 'source'], ['desc', 'asc'])
			// filter out duplicate links
			.uniqWith((x, y) => x.source === y.source && x.target === y.target)
			// transform to numeric references
			.map((x) => ({ source: userIds[x.source], target: userIds[x.target], relation: x.kind }))
			.value();

		const output = Object.assign({}, users, { links: userLinks });
		fs.writeFile(path.join(__dirname,'../public/merged.json'), JSON.stringify(output, null, 2), err => {
			if (err) throw err;
			console.log('Done!');
		});
	});
});

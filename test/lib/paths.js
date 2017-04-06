const path = require('path');

const paths = require('../../src/lib/paths');

describe('paths', () => {
    it('should ignore some urls', () => {
        const isUrlShouldBeIgnored = (url) =>
            paths.isUrlShouldBeIgnored(url, {});

        assert.ok([
            '#hash',
            '%23encodedHash',
            '/absoluteUrl',
            'data:someDataInlined',
            'https://somecdnpath.com/asset.png'
        ].every(isUrlShouldBeIgnored));
    });

    it('should\'t ignore absolute urls if have basePath', () => {
        assert.notOk(paths.isUrlShouldBeIgnored('/absoluteUrl', {
            basePath: ['/path']
        }));
    });

    describe('assets paths', () => {
        const baseDir = path.resolve('/user/project');

        it('should calc assets path', () => {
            assert.equal(
                paths.getAssetsPath(baseDir, 'images', 'imported'),
                path.resolve('/user/project/images/imported')
            );
        });

        it('should calc assets path with absolute assetsPath param', () => {
            assert.equal(
                paths.getAssetsPath(baseDir, '/user/assets/', 'imported'),
                path.resolve('/user/assets/imported')
            );
        });

        it('should calc assets path without assetsPath param', () => {
            assert.equal(
                paths.getAssetsPath(baseDir, null, 'imported'),
                path.resolve('/user/project/imported')
            );
        });
    });

    it('should return assets output base dir', () => {
        const dir = {
            from: '/user/project/css',
            to: '/user/project/build'
        };

        assert.equal(
            paths.getTargetDir(dir),
            dir.to
        );
        assert.equal(
            paths.getTargetDir({ from: '/project', to: '/project' }),
            process.cwd()
        );
    });

    it('should return decl file dir', () => {
        const decl = {
            source: { input: { file: '/project/styles/style.css' } }
        };

        assert.equal(paths.getDirDeclFile(decl), '/project/styles');
        assert.equal(paths.getDirDeclFile({}), process.cwd());
    });

    describe('calc path by basePath', () => {
        const basePath = path.resolve('/project/node_modules');
        const dirFrom = path.resolve('/project/styles');

        it('absolute basePath', () => {
            assert.deepEqual(
                paths.getPathByBasePath(basePath, dirFrom, './img/image.png'),
                [path.resolve('/project/node_modules/img/image.png')]
            );
        });

        it('relative basePath', () => {
            assert.deepEqual(
                paths.getPathByBasePath('../base-path', dirFrom, './img/image.png'),
                [path.resolve('/project/base-path/img/image.png')]
            );
        });

        it('absolute assetUrl', () => {
            assert.deepEqual(
                paths.getPathByBasePath(basePath, dirFrom, '/img/image.png'),
                [path.resolve('/project/node_modules/img/image.png')]
            );
        });

        it('multiple basePath', () => {
            assert.deepEqual(
                paths.getPathByBasePath(
                    [basePath, '/some_base_path'],
                    dirFrom,
                    '/img/image.png'
                ),
                [
                    path.resolve('/project/node_modules/img/image.png'),
                    path.resolve('/some_base_path/img/image.png')
                ]
            );
        });
    });

    it('should prepare asset data from url and dirs', () => {
        const assetUrl = './sprite/some-image.png?test=1#23';
        const dirs = {
            from: '/project/css',
            file: '/project/css/imported'
        };

        const asset = paths.prepareAsset(assetUrl, dirs);

        // normalizing path for windows
        asset.relativePath = paths.normalize(asset.relativePath);

        assert.deepEqual(asset, {
            url: './sprite/some-image.png?test=1#23',
            pathname: './sprite/some-image.png',
            absolutePath: path.resolve('/project/css/imported/sprite/some-image.png'),
            relativePath: 'imported/sprite/some-image.png',
            search: '?test=1',
            hash: '#23'
        });
    });

    it('should prepare custom assets', () => {
        const dirs = {
            from: '/project/css',
            file: '/project/css/imported'
        };
        const decl = {
            source: { input: { file: '/project/styles/style.css' } }
        };

        const checkCustomAsset = (assetUrl) => {
            const asset = paths.prepareAsset(assetUrl, dirs, decl);

            assert.equal(asset.absolutePath, '/project/styles/style.css');
            assert.equal(paths.normalize(asset.relativePath), '../styles/style.css');
        };

        ['#hash', '%23ecodedhash', 'data:'].forEach(checkCustomAsset);
    });
});

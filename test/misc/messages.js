const path = require('path');

describe('misc', () => {
    it('should add dependency messages with copy', () => {
        return postcss()
            .use(postcssUrl({
                url: 'copy',
                assetsPath: 'test/fixtures/build/assets'
            }))
            .process(read('fixtures/copy'), {
                from: 'test/fixtures/copy.css'
            })
            .then((result) => {
                const dependencies = result.messages.filter((m) => m.type === 'dependency');

                const expected = [
                    {
                        type: 'dependency',
                        file: path.resolve('test/fixtures/imported/pixel.png'),
                        parent: path.resolve('test/fixtures/copy.css')
                    },
                    {
                        type: 'dependency',
                        file: path.resolve('test/fixtures/pixel.gif'),
                        parent: path.resolve('test/fixtures/copy.css')
                    }
                ];

                assert.deepEqual(
                    dependencies.sort((a, b) => a.file.length - b.file.length),
                    expected.sort((a, b) => a.file.length - b.file.length)
                );
            });
    });

    it('should add dependency messages with inline', () => {
        return postcss()
            .use(postcssUrl({
                url: 'inline',
                assetsPath: 'test/fixtures/build/assets'
            }))
            .process(read('fixtures/copy'), {
                from: 'test/fixtures/copy.css'
            })
            .then((result) => {
                const dependencies = result.messages.filter((m) => m.type === 'dependency');

                const expected = [
                    {
                        type: 'dependency',
                        file: path.resolve('test/fixtures/imported/pixel.png'),
                        parent: path.resolve('test/fixtures/copy.css')
                    },
                    {
                        type: 'dependency',
                        file: path.resolve('test/fixtures/pixel.gif'),
                        parent: path.resolve('test/fixtures/copy.css')
                    }
                ];

                assert.deepEqual(
                    dependencies.sort((a, b) => a.file.length - b.file.length),
                    expected.sort((a, b) => a.file.length - b.file.length)
                );
            });
    });
});

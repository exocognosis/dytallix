const main = async () => {
    try {
        const sig = await import('@openforge-sh/liboqs/sig');
        const creators = Object.keys(sig).filter(k => k.startsWith('create'));
        console.log('Creators:', creators);
    } catch (e) {
        console.error('Error importing sig:', e.message);
    }
};
main();

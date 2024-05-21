import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { 
    createV1, 
    mplCore, 
    fetchAssetV1,
    transferV1,
    createCollectionV1, 
    getAssetV1GpaBuilder, 
    Key, 
    updateAuthority, 
    pluginAuthorityPair, 
    ruleSet,
    
} from '@metaplex-foundation/mpl-core'
import { TransactionBuilderSendAndConfirmOptions, generateSigner, signerIdentity, createSignerFromKeypair, sol } from '@metaplex-foundation/umi';

const umi = createUmi('https://api.devnet.solana.com', 'processed').use(mplCore())


const asset = generateSigner(umi);
const privateKey = new Uint8Array(/* Your private key here */);
const myKeypair = umi.eddsa.createKeypairFromSecretKey(privateKey);
const payer = createSignerFromKeypair(umi, myKeypair);

umi.use(signerIdentity(payer));

const txConfig: TransactionBuilderSendAndConfirmOptions = {
    send: { skipPreflight: true },
    confirm: { commitment: 'processed' },
};

async function main() {
    // 1. Airdrop to payer
    // console.log('1. Airdropping to: ', payer.publicKey.toString());
    // const airdropAmount = sol(100);
    // await umi.rpc.airdrop(umi.identity.publicKey, airdropAmount, txConfig.confirm);

    // 2. Create a collection asset
    const collectionAddress = generateSigner(umi);
    console.log('2. Creating Collection:', collectionAddress.publicKey.toString());
    const collectionUpdateAuthority = generateSigner(umi);
    const creator1 = generateSigner(umi);
    const creator2 = generateSigner(umi);
    const step2Res = await createCollectionV1(umi, {
        name: 'Quick Collection',                           // 👈 Replace this
        uri: 'https://your.domain.com/collection.json',     // 👈 Replace this
        collection: collectionAddress,
        updateAuthority: collectionUpdateAuthority.publicKey,
        plugins: [
            pluginAuthorityPair({
                type: 'Royalties',
                data: {
                    basisPoints: 500,
                    creators: [
                        {
                            address: creator1.publicKey,
                            percentage: 20,
                        },
                        {
                            address: creator2.publicKey,
                            percentage: 80,
                        },
                    ],
                    ruleSet: ruleSet('None'), // Compatibility rule set
                },
            }),
        ],
    }).sendAndConfirm(umi, txConfig);
    console.log(step2Res);


    // 3. Create an asset in a collection
    console.log('3. Asset Collection:', asset.publicKey.toString());
    const step3Res = await createV1(umi, {
        name: 'Quick Asset #1',                         // 👈 Replace this
        uri: 'https://your.domain.com/asset-id.json',   // 👈 Replace this
        asset: asset,
        collection: collectionAddress.publicKey,
        authority: collectionUpdateAuthority,
    }).sendAndConfirm(umi, txConfig);
    console.log(step3Res);

    // 4. Fetch assets by owner
    console.log('4. Fetching Assets by owner:', payer.publicKey);
    const assetsByOwner = await getAssetV1GpaBuilder(umi)
        .whereField('key', Key.AssetV1)
        .whereField('owner', payer.publicKey)
        .getDeserialized();
    console.log(assetsByOwner);

    // 5. Fetch assets by collection
    console.log('5. Fetching Assets by collection:', collectionAddress.publicKey);
    const assetsByCollection = await getAssetV1GpaBuilder(umi)
        .whereField('key', Key.AssetV1)
        .whereField(
            'updateAuthority',
            updateAuthority('Collection', [collectionAddress.publicKey])
        )
        .getDeserialized();
    console.log(assetsByCollection);

    // 6. Transfer an asset
    const recipient = generateSigner(umi);
    console.log('6. Fetching Assets by collection:', recipient.publicKey);
    const step6Res = await transferV1(umi, {
        asset: asset.publicKey,
        newOwner: recipient.publicKey,
        collection: collectionAddress.publicKey,
     }).sendAndConfirm(umi, txConfig);
     console.log(step6Res);

     // 7. Verifying transfer
     const transferredAsset = await fetchAssetV1(umi, asset.publicKey);
     console.log('7. Verifying transfer for:', recipient.publicKey);
     if (transferredAsset.owner.toString() !== recipient.publicKey.toString()) {
         throw new Error('Transfer failed');
     } else {
        console.log("Success !!!");
     }
}

main().catch(console.error);
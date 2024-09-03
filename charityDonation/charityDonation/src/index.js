import { createApp } from "@deroll/app";
import { getAddress, hexToString, stringToHex } from "viem";

const app = createApp({ url: process.env.ROLLUP_HTTP_SERVER_URL || "http://127.0.0.1:5004" });

let campaigns = {};
let donations = {};

app.addAdvanceHandler(async ({ metadata, payload }) => {
    const sender = getAddress(metadata.msg_sender);
    const payloadString = hexToString(payload);
    console.log("Sender:", sender, "Payload:", payloadString);

    try {
        const jsonPayload = JSON.parse(payloadString);

        if (jsonPayload.method === "create_campaign") {
            campaigns[jsonPayload.campaignId] = {
                title: jsonPayload.title,
                goal: BigInt(jsonPayload.goal),
                amountRaised: BigInt(0),
                creator: sender
            };
            console.log("Campaign created:", jsonPayload.campaignId);

        } else if (jsonPayload.method === "donate") {
            const campaign = campaigns[jsonPayload.campaignId];
            if (campaign) {
                const donationAmount = BigInt(jsonPayload.amount);
                campaign.amountRaised += donationAmount;
                donations[sender] = (donations[sender] || BigInt(0)) + donationAmount;
                console.log("Donation made:", jsonPayload.amount);
            } else {
                console.error("Error: Campaign not found.");
            }
        }

        return "accept";
    } catch (e) {
        console.error(e);
        app.createReport({ payload: stringToHex(String(e)) });
        return "reject";
    }
});

app.addInspectHandler(async ({ payload }) => {
    const campaignId = hexToString(payload).split("/")[1];
    const campaign = campaigns[campaignId] || {};
    await app.createReport({ payload: stringToHex(JSON.stringify(campaign)) });
});

app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
 the 
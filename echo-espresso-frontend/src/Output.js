import { ethers } from "ethers";
import { useQuery, gql } from "@apollo/client";
import { useToast } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

// GraphQL query to retrieve notices given a cursor
const GET_NOTICES = gql`
    query GetNotices($cursor: String) {
        notices(first: 10, after: $cursor) {
            totalCount
            pageInfo {
                hasNextPage
                endCursor
            }
            edges {
                node {
                    index
                    input {
                        index
                    }
                    payload
                }
            }
        }
    }
`;

// This component renders all the Notices produced by the Echo DApp.
// The Echo Dapp uses notices to echo the Inputs it receives.
// This component sends GraphQL requests to the Cartesi Rollups Query Server
function EchoesList() {
    const toast = useToast();
    const [noticeEchoes, setNoticeEchoes] = useState([]);
    const [cursor, setCursor] = useState(null);

    // Retrieve notices every 500 ms
    const { loading, error, data } = useQuery(GET_NOTICES, {
        variables: { cursor },
        pollInterval: 500,
    });

    // Check query status
    useEffect(() => {
        if (loading) {
            toast({
                title: "Loading Query Server results",
                status: "info",
                duration: 5000,
                isClosable: true,
                position: "top-right",
            });
        }
        if (error) {
            toast({
                title: "Error querying Query Server ",
                description: `Check browser console for details`,
                status: "error",
                duration: 20000,
                isClosable: true,
                position: "top-right",
            });
            console.error(
                `Error querying Query Server : ${JSON.stringify(error)}`
            );
        }
    });

    // Check query result
    const length = data?.notices?.edges?.length;
    if (length) {
        // Update cursor so that next GraphQL poll retrieves only newer data
        setCursor(data.notices.pageInfo.endCursor);
    }

    // Render new echoes
    const newEchoes = data?.notices?.edges?.map(({ node }) => {
        // Render echo from notice
        const size = (node.payload.length - 2)/2;
        console.log(`Detected new echo : size ${size}!`);

        return (
            <div key={`${node.input.index}-${node.index}`}>
                <p>Found payload of size: {size}</p>
            </div>
        );
    });

    // Concat new echoes with previous ones
    let ret = noticeEchoes;
    if (newEchoes && newEchoes.length) {
        // Add new rendered echoes to stored data
        ret = noticeEchoes.concat(newEchoes);
        setNoticeEchoes(ret);
    }
    return ret;
}

function Echoes() {
    return (
        <div>
            <label>
                <p>Output</p>
            </label>
            <EchoesList />
        </div>
    );
}

export default Echoes;

import 'webextension-polyfill';
import { savedGoalsStorage, savedSettingsStorage } from '@chrome-extension-boilerplate/storage';
import { fetchChatCompletion } from './AIHelpers';
import axios from 'axios';
import { marked } from 'marked';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface TranscriptItem {
    start: string;
    end: string;
    text: string;
  }
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
        console.log("12131313")
        if (message.type === 'newVideoLoaded') {
            const videoTitle = message.videoTitle;
            if (videoTitle) {
                console.log('Received video title in background:', videoTitle);
                const analysisResult = await analyzeVideoTitle(videoTitle);
                console.log('Result', analysisResult);
                sendResponse(analysisResult);
            } else {
                console.log('No title received or title is empty.');
            }
        }
        if(message.type==='newSummaryLoaded'){

            console.log("here hello")
            const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = message.videoUrl.match(regex);
           const videoId= match ? match[1] : null;
            console.log("this is video id", videoId);
            if(videoId){
                const videoSummary=await videoSummarization(videoId);
                sendResponse(videoSummary);
            }

        }
        if (message.type === 'recommendationsLoaded') {
            const videoData = message.videoData;
            console.log('Received recommended video data in background:', videoData);
            if (videoData && Object.keys(videoData).length > 0) {
                const filterResult = await analyzeRecommendations(videoData);
                console.log('Filter', filterResult);
                sendResponse(filterResult);
            } else {
                console.log('No video data received or data is empty.');
            }
        }
    })();

    // Important! Return true to indicate you want to send a response asynchronously
    return true;
});

async function analyzeRecommendations(videoData: Record<string, string>) {
    const { helpful, harmful } = await savedGoalsStorage.get();

    const systemPrompt = `You are a Youtube Distraction Helper expert. Evaluate each video and determine if it should be shown to the user or not.
                    Make sure you evaluate the video based on all of the user's goals. Any unrelated video shown can be a negative distraction.
                    The response must only contain the videos that should be shown to the user with the reason for showing each video.
                    Your response must be pure JSON without any other text, and it needs to be valid JSON.
                    The format of the response should be like this:
                    {
                        "videos": [{id: "video-id", reason: "reason for showing the video"}, ...] 
                    }
                    object have a "videos" item that is an array of objects, each with "id" and "reason" properties.
                    `

    const prompt = `Given the user's goal: "${helpful}", and videos to avoid: "${harmful}", evaluate the following video data: ${JSON.stringify(videoData)}.
                    Make sure the response should only contain the videos that should be shown to the user with the reason for showing each video.`

    const result = await fetchChatCompletion(systemPrompt, prompt);
    let analysisResult;
    try {
        analysisResult = JSON.parse(result);
    } catch (error) {
        console.error('Failed to parse JSON:', result);
        throw error;
    }

    return analysisResult;
}
async function videoSummarization(videoId: string) {
    console.log("vdio summary.................")

    const systemPrompt = `You are a expert video summary generator. Your task is to create concise and engaging summaries of YouTube videos. Each summary should include the main topics, key points, and any significant quotes while maintaining a tone that appeals to potential viewers. Keep summaries between 150-200 words and ensure they capture the essence of the video effectively.`


    const transcriptOptions = {
        method: 'GET',
        url: 'https://youtube-video-summarizer-gpt-ai.p.rapidapi.com/api/v1/get-transcript-v2',
        params: {
          video_id: videoId, // Pass the video ID dynamically
          platform: 'youtube',
        },
        headers: {
          'x-rapidapi-key': 'baec25cfccmsh79e2ceafb60290fp1a9652jsn7c2c68d8cc7f',
          'x-rapidapi-host': 'youtube-video-summarizer-gpt-ai.p.rapidapi.com'
        }
      };

      const transcriptResponse = await axios.request(transcriptOptions);
      const transcriptData: TranscriptItem[] = transcriptResponse.data.data.transcripts.en_auto.default; // Assuming transcript is in `transcript` field
      const combinedTranscript = transcriptData.map((item) => item.text).join(' ');
      const prompt = combinedTranscript;

     const result = await fetchChatCompletion(systemPrompt, prompt);
    let analysisResult;
    try {
        analysisResult = marked(result);

    } catch (error) {
        console.error('Failed to parse JSON:', result);
        throw error;
    }

    return analysisResult;
}

async function analyzeVideoTitle(title: string) {
    console.log("analysing video title...................")
    const { helpful, harmful } = await savedGoalsStorage.get();

    const systemPrompt = `You are a Youtube Distraction Helper expert. Evaluate if the video is relevant, should be avoided, or not sure.
                        Your resonse must be pure JSON without any other text, and it needs to be valid JSON
                        response must have two items "evaluation_rating" and "evaluation_context".
                        In evaluation_rating, there are four possible options: "relevant", "not_sure", "irrelevant", "avoid"
                        In the evaluation_context, provide one user-facing sentence. 
                        Adjust the tone based on the rating:
                        - "relevant": positive tone
                        - "not_sure": neutral tone
                        - "irrelevant": encouraging tone to get back on track
                        - "avoid": teasing but assertive tone
                        Assume the user understands the language of the video. Provide the evaluation_context in English.`;
    const prompt = `Given the user's goal: "${helpful}", and video to avoid: "${harmful}", evaluate the following video title: "${title}".`
    const result = await fetchChatCompletion(systemPrompt, prompt);
    let analysisResult;
    try {
        analysisResult = JSON.parse(result);
    } catch (error) {
        console.error('Failed to parse JSON:', result);
        throw error;
    }

    return analysisResult;
}

async function updateBadge() {
    const { apiErrorStatus } = await savedSettingsStorage.get();
    if (apiErrorStatus && apiErrorStatus.type) {
        const badgeText = (apiErrorStatus.type === 'AUTH' || apiErrorStatus.type === 'RATE_LIMIT') ? '!' : '';
        await chrome.action.setBadgeText({ text: badgeText });
        await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } else {
        await chrome.action.setBadgeText({ text: '' });
    }
}

savedSettingsStorage.subscribe(() => {
    updateBadge();
});

chrome.runtime.onStartup.addListener(updateBadge);
chrome.runtime.onInstalled.addListener(updateBadge);
// import { NextResponse } from 'next/server';
// import Anthropic from '@anthropic-ai/sdk';

// interface TaskBreakdown {
//   tasks: {
//     title: string;
//     estimatedPomodoros: number;
//   }[];
// }

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const {
//       description,
//       startDate,
//       endDate,
//       pomodoroDuration,
//       shortBreakDuration,
//       longBreakDuration,
//     } = body;

//     const apiKey = process.env.CLAUDE_API_KEY;
//     if (!apiKey) {
//       throw new Error('CLAUDE_API_KEY is not set in the environment variables');
//     }

//     const anthropic = new Anthropic({
//       apiKey: apiKey,
//     });

//     console.log('Sending request to Claude API with body:', {
//       description,
//       startDate: startDate || 'Not specified',
//       endDate: endDate || 'Not specified',
//       pomodoroDuration,
//       shortBreakDuration,
//       longBreakDuration,
//     });

//     const prompt = `Given the following task description and time constraints, please break it down into subtasks with estimated Pomodoro sessions (${pomodoroDuration}-minute work intervals) for each:

// Task Description: ${description}
// Start Date: ${startDate || 'Not specified'}
// End Date: ${endDate || 'Not specified'}
// Pomodoro Duration: ${pomodoroDuration} minutes
// Short Break Duration: ${shortBreakDuration} minutes
// Long Break Duration: ${longBreakDuration} minutes

// Please provide the breakdown in the following JSON format without any additional text or formatting:
// {
//   "tasks": [
//     {
//       "title": "Subtask title",
//       "estimatedPomodoros": number
//     },
//     ...
//   ]
// }`;

//     const message = await anthropic.messages.create({
//       model: 'claude-3-5-sonnet-20240620', // Verify this model name with Anthropic's documentation
//       max_tokens: 1000,
//       messages: [
//         {
//           role: 'user',
//           content: prompt,
//         },
//       ],
//     });

//     console.log('Claude API Response:', JSON.stringify(message, null, 2));
//     if (!message.content || message.content.length === 0) {
//       throw new Error('Unexpected empty response from Claude API');
//     }

//     const aiContent = message.content
//       .map(block => 'text' in block ? block.text : '')
//       .join(' ')
//       .trim();

//     if (!aiContent) {
//       throw new Error('Unexpected response structure from Claude API');
//     }
//     }

//     const aiContent = assistantMessage.content.trim();

//     // Log the assistant's content for debugging
//     console.log('Assistant Response Content:', aiContent);

//     // Attempt to parse the AI's response
//     let taskBreakdown: TaskBreakdown;
//     try {
//       taskBreakdown = JSON.parse(aiContent);
//     } catch (parseError) {
//       console.error('Failed to parse AI response:', parseError);
//       throw new Error('Failed to parse AI response. Ensure the AI returns valid JSON.');
//     }

//     // Validate the structure of the parsed JSON
//     if (
//       !taskBreakdown.tasks ||
//       !Array.isArray(taskBreakdown.tasks) ||
//       !taskBreakdown.tasks.every(
//         (task) =>
//           typeof task.title === 'string' &&
//           typeof task.estimatedPomodoros === 'number'
//       )
//     ) {
//       throw new Error('AI response format is incorrect');
//     }

//     return NextResponse.json(taskBreakdown);
//   } catch (error) {
//     console.error('Error processing Claude API request:', error);
//     return NextResponse.json(
//       { error: 'Internal Server Error', details: (error as Error).message },
//       { status: 500 }
//     );
//   }
// }
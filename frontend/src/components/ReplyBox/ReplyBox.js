import React from 'react';
import { Paper, Stack, Avatar, Typography } from '@mui/material';
import PlaceholderProfilePicture from '../../assets/pfp.png'
import './ReplyBox.css'

const ReplyBox = ({reply, author, time, profilePicture}) => {

    return(
        <Paper elevation={2}>
            <Stack className='replyContents' direction='column'>
                <Stack className='authorInfo' direction='row' spacing={3}>
                    <Avatar alt="Profile Picture" src={PlaceholderProfilePicture} />
                    <Typography className='authorName'>
                        {author}
                    </Typography>
                    <Typography className='time'>
                        {time}
                    </Typography>
                </Stack>
                <Typography className='replyText' sx={{
                    maxWidth: '900px',
                    wordBreak: 'break-word'
                }}>
                    {reply}
                </Typography>
            </Stack>
        </Paper>
    );
}



export default ReplyBox;
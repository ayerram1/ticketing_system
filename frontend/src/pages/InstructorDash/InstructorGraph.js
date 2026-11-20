import React, { useEffect, useState } from "react";
import Chart from "chart.js/auto";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Cookies from "js-cookie";
import {fetchTaTicketsByUserId } from "../../services/ticketServices";

const baseURL = process.env.REACT_APP_API_BASE_URL;

const InstructorGraph = () => {
    const [user, setUser] = useState(null);
    const [TaTicket, setTaTickets] = useState([]);
    try{

    useEffect(() => {
        const fetchTickets = async () =>{
            const response = await fetchTaTicketsByUserId();
            
            const TaTickets = response.tickets || response;
            
            const TaTicketsData = TaTickets;
            const TaTicketsRaw = TaTicketsData.tickets || TaTicketsData;

            setTaTickets(TaTicketsRaw);


    };
    fetchTickets();
    },[]);


    useEffect(()=> {
        const ID = document.getElementById('myChart');
        let TempData = [];
        for(let i = 0; i<12; i++){
            TempData.push(TaTicket?.filter(ticket => { const month = new Date(ticket.created_at).getMonth();
                        return month ===i && ticket.created_at !== null}).length)
        }
        const Data = TempData;

        const InstGraph = new Chart(ID, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                {
                    label: 'Total Tickets',
                    data: Data, 
                    backgroundColor: 'red', 
                    borderColor: 'blue',      
                    borderWidth: 1
                },
                ],
            },
            options: {
                scales: {
                    y:{
                        min: 0,
                        max: 20,
                        ticks: {
                            maxTicksLimit: 5
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Tickets Made per Month',
                    }
                    
                },
                responsive: true
            },
        },[TaTicket]);

        InstGraph.resize(500, 220);
        return () => {
          InstGraph.destroy();
        };
    }, [user, TaTicket]); 
    return (
        <Box>
          <canvas id= "myChart" />
        </Box>
    );
}catch (err) {
      console.error("Error dispalying Graph", err);
    }
};

export default InstructorGraph;
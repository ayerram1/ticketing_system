import React, { useEffect, useState } from "react";
import Chart from "chart.js/auto";
import { Box } from "@mui/material";
import { fetchTicketAssignmentsByUserId, fetchTaTicketAssignmentsByUserId, fetchTaTicketById, fetchTicketById} from "../../services/ticketServices";

const baseURL = process.env.REACT_APP_API_BASE_URL;

const AssignedChart = () => {
    const [user, setUser] = useState(null);
    const [AssignedTicket, setAssignedTicket] = useState([]);
    try{

    useEffect(() => {
        const fetchTickets = async () =>{
            //const response = await fetchTicketAssignmentsByUserId();

            const [instructAssign, taAssign] = await Promise.all([
                            fetchTicketAssignmentsByUserId(),
                            fetchTaTicketAssignmentsByUserId(),
                        ]);
            const CombinedAssign = [...instructAssign, ...taAssign];

            const ticketList = await Promise.all(CombinedAssign.map(async (ticket) => {
                let ticketData;
                if (ticket.type === "ta") {
                    ticketData = await fetchTaTicketById(ticket.ticket_id);
                } else {
                    ticketData = await fetchTicketById(ticket.ticket_id);
                }
                return ticketData;
        }));
        setAssignedTicket(ticketList);
    };
    fetchTickets();
    },[]);


    useEffect(()=> {
        const ID = document.getElementById('AChart');
        ID.width=500;
        ID.height=300;
        let TempData = [];
        for(let i = 0; i<12; i++){
            TempData.push(AssignedTicket?.filter(ticket => { const month = new Date(ticket.created_at).getMonth();
                        return month ===i && ticket.created_at !== null}).length)
        }
        const Data = TempData;

        const AsignChar = new Chart(ID, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                {
                    label: 'Total Tickets',
                    data: Data, 
                    backgroundColor: 'green', 
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
                        text: 'Tickets Assigned per Month',
                    }
                },
                responsive: true
            },
        },[AssignedTicket]);
        AsignChar.resize(500, 230);
        return () => {
          AsignChar.destroy();
        };
    }, [user, AssignedTicket]); 
    return (
        <Box>
          <canvas id= "AChart"/>
        </Box>
    );
}catch (err) {
      console.error("Error dispalying Graph", err);
    }
};

export default AssignedChart;
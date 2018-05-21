$(document).ready(function() {
    $('.nav-item, .dropdown-item').on('click', function() {
        var $this = $(this);
        var url = $this.attr('url');
        
        if (url) {
            loadContent(url);
        }
    });

    function loadContent(url) {
        $('#content').attr("src", url);

        $("#content").on('load', function() {
            document.title = $(this).contents().attr('title');
        });
    }
});
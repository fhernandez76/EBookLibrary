using EBookLibrary.Domain.Enums;
using FluentValidation;

namespace EBookLibrary.Application.Books.Commands.CreateBook;

public class CreateBookCommandValidator : AbstractValidator<CreateBookCommand>
{
    public CreateBookCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Pages).GreaterThanOrEqualTo(0);
        RuleFor(x => x.PublicationYear)
            .InclusiveBetween(1000, DateTime.UtcNow.Year + 1)
            .When(x => x.PublicationYear.HasValue);
        RuleFor(x => x.Isbn).MaximumLength(20).When(x => x.Isbn is not null);
        RuleFor(x => x.Language).NotEmpty()
            .Must(l => Enum.TryParse<BookLanguage>(l, true, out _))
            .WithMessage("Invalid language. Valid values: Spanish, English, Other.");
        RuleFor(x => x.AuthorIds).NotEmpty().WithMessage("At least one author is required.");
    }
}
